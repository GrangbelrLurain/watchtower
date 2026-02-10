//! Local HTTP proxy: Host-based routing to local backends.
//! Listens on 127.0.0.1:port. When client uses this as HTTP proxy,
//! requests are forwarded; if Host matches a route, target is local host:port.
//! When no route matches, the host can be resolved via an optional DNS server before forwarding.

use axum::{
    body::Body,
    extract::{Request, State},
    http::uri::Uri,
    response::IntoResponse,
    routing::any,
    Router,
};
use hickory_resolver::config::{NameServerConfigGroup, ResolverConfig};
use hickory_resolver::name_server::TokioConnectionProvider;
use hickory_resolver::Resolver;
use hyper::StatusCode;
use hyper_util::client::legacy::connect::HttpConnector;
use hyper_util::client::legacy::Client;
use hyper_util::rt::TokioExecutor;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::task::JoinHandle;

use crate::service::local_route_service::LocalRouteService;

type HyperClient = Client<HttpConnector, Body>;
type TokioResolver = Resolver<TokioConnectionProvider>;

/// Parse "8.8.8.8" or "8.8.8.8:53" into (IpAddr, port). Returns None if invalid.
fn parse_dns_server(s: &str) -> Option<(IpAddr, u16)> {
    let s = s.trim();
    if s.is_empty() {
        return None;
    }
    if let Some((ip_str, port_str)) = s.split_once(':') {
        let ip: IpAddr = ip_str.trim().parse().ok()?;
        let port: u16 = port_str.trim().parse().ok()?;
        Some((ip, port))
    } else {
        let ip: IpAddr = s.parse().ok()?;
        Some((ip, 53))
    }
}

pub struct ProxyState {
    client: HyperClient,
    route_service: Arc<LocalRouteService>,
    /// When set, pass-through hosts are resolved via this DNS server before forwarding.
    resolver: Option<Arc<TokioResolver>>,
}

impl ProxyState {
    fn new(route_service: Arc<LocalRouteService>, dns_server: Option<String>) -> Self {
        let client = Client::builder(TokioExecutor::new()).build(HttpConnector::new());
        let resolver = dns_server
            .as_ref()
            .and_then(|s| parse_dns_server(s))
            .and_then(|(ip, port)| {
                let config = ResolverConfig::from_parts(
                    None,
                    vec![],
                    NameServerConfigGroup::from_ips_clear(&[ip], port, true),
                );
                let r = Resolver::builder_with_config(
                    config,
                    TokioConnectionProvider::default(),
                )
                .build();
                Some(Arc::new(r))
            });
        Self {
            client,
            route_service,
            resolver,
        }
    }
}

/// Returns (target_uri_string, pass_through_host).
/// If host matches an enabled route, returns (http://target_host:target_port/path, None).
/// Otherwise pass-through: (absolute_uri, Some(host)) for optional DNS resolution.
fn resolve_target(
    uri: &Uri,
    host_from_header: Option<&str>,
    routes: &[crate::model::local_route::LocalRoute],
) -> (String, Option<String>) {
    let host = uri
        .authority()
        .map(|a| a.host())
        .or(host_from_header)
        .unwrap_or("");

    let path_query = uri
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");

    for r in routes {
        if r.enabled && host.eq_ignore_ascii_case(r.domain.as_str()) {
            return (
                format!(
                    "http://{}:{}{}",
                    r.target_host,
                    r.target_port,
                    path_query
                ),
                None,
            );
        }
    }

    // Pass-through
    let target = if uri.scheme().is_some() && uri.authority().is_some() {
        uri.to_string()
    } else if let Some(h) = host_from_header {
        let scheme = uri.scheme_str().unwrap_or("http");
        format!("{}://{}{}", scheme, h, path_query)
    } else {
        format!("http://{}{}", host, path_query)
    };
    (target, Some(host.to_string()))
}

/// Resolve hostname to an IPv4 or IPv6 address using the configured resolver. Returns first IP.
async fn resolve_host_via_dns(resolver: &TokioResolver, host: &str) -> Option<IpAddr> {
    let lookup = resolver.lookup_ip(host).await.ok()?;
    lookup.iter().next()
}

async fn proxy_handler(State(state): State<Arc<ProxyState>>, mut req: Request) -> impl IntoResponse {
    let host_header = req
        .headers()
        .get("host")
        .and_then(|v| v.to_str().ok());
    let routes = state.route_service.get_enabled();
    let (mut target_uri_str, pass_through_host) = resolve_target(req.uri(), host_header, &routes);

    // When no local route matched and DNS server is set, resolve host to IP and rewrite URI
    if let Some(host) = pass_through_host.as_deref() {
        if !host.is_empty() {
            if let Some(resolver) = state.resolver.as_ref() {
                if let Some(ip) = resolve_host_via_dns(resolver, host).await {
                    // Rewrite target to use resolved IP, keeping scheme, port, path
                    if let Ok(u) = Uri::try_from(target_uri_str.as_str()) {
                        let port = u.port_u16().unwrap_or_else(|| {
                            if u.scheme_str() == Some("https") {
                                443
                            } else {
                                80
                            }
                        });
                        let scheme = u.scheme_str().unwrap_or("http");
                        let path_query = u
                            .path_and_query()
                            .map(|pq| pq.as_str())
                            .unwrap_or("/");
                        target_uri_str = format!("{}://{}:{}{}", scheme, ip, port, path_query);
                    }
                }
            }
        }
    }

    let target_uri = match Uri::try_from(target_uri_str.as_str()) {
        Ok(u) => u,
        Err(_) => return (StatusCode::BAD_REQUEST, "Invalid target URI").into_response(),
    };

    *req.uri_mut() = target_uri;

    match state.client.request(req).await {
        Ok(res) => res.into_response(),
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            format!("Proxy error: {}", e),
        )
            .into_response(),
    }
}

/// Bind to 127.0.0.1:port and run the proxy. Returns the JoinHandle so the caller can abort it.
/// When dns_server is Some (e.g. "8.8.8.8"), hosts not matching any route are resolved via this DNS before forwarding.
pub async fn run_proxy(
    port: u16,
    route_service: Arc<LocalRouteService>,
    dns_server: Option<String>,
) -> std::io::Result<JoinHandle<()>> {
    let addr = SocketAddr::from(([127, 0, 0, 1], port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let state = Arc::new(ProxyState::new(route_service, dns_server));
    let app = Router::new()
        .route("/*path", any(proxy_handler))
        .with_state(state);

    let handle = tokio::spawn(async move {
        axum::serve(listener, app).await.ok();
    });

    Ok(handle)
}
