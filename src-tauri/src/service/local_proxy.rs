//! Local HTTP proxy: Host-based routing to local backends.
//! Listens on 127.0.0.1:port. When client uses this as HTTP proxy,
//! requests are forwarded; if Host matches a route, target is local host:port.
//! When no route matches, the host can be resolved via an optional DNS server before forwarding.
//! CONNECT (HTTPS) is supported: for local routes we do TLS termination and forward HTTP to localhost;
//! for pass-through we establish a tunnel to the target.

use axum::{
    body::Body,
    extract::{Request, State},
    http::header::{HeaderValue, CONTENT_TYPE},
    http::uri::Uri,
    response::{Html, IntoResponse, Response},
    routing::any,
    Router,
};
use hickory_resolver::config::{NameServerConfigGroup, ResolverConfig};
use hickory_resolver::name_server::TokioConnectionProvider;
use hickory_resolver::Resolver;
use hyper::client::conn::http1::handshake as client_handshake;
use hyper::server::conn::http1::Builder as Http1Builder;
use hyper::StatusCode;
use hyper_util::rt::TokioIo;
use hyper_util::service::TowerToHyperService;
use rcgen::{CertificateParams, DnType, KeyPair, IsCa, BasicConstraints}; // Import IsCa for CertificateParams
use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use rustls::server::{ClientHello, ResolvesServerCert};
use rustls::sign::CertifiedKey;
use std::collections::HashMap;
use std::io::Cursor;
use std::net::{IpAddr, SocketAddr, ToSocketAddrs};
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use std::sync::Arc;
use std::task::{Context, Poll};
use time::{Duration, OffsetDateTime};
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt, ReadBuf};
use tokio::net::TcpStream;
use tokio::task::JoinHandle;
use tokio_rustls::TlsAcceptor;

use chrono;
use crate::model::api_log::ApiLogEntry;
use crate::model::local_route::LocalRoute;
use crate::service::api_log_service::ApiLogService;
use crate::service::api_mock_service::ApiMockService;
use crate::service::local_route_service::LocalRouteService;

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum IncomingScheme {
    Http,
    Https,
}

macro_rules! proxy_log {
    ($($t:tt)*) => { eprintln!("[proxy] {}", format!($($t)*)) }
}

type TokioResolver = Resolver<TokioConnectionProvider>;

// ── Local routing toggle ───────────────────────────────────────────────
/// Global flag: when `false` the proxy still runs but passes all traffic through
/// without matching local routes (pure pass-through mode).
static LOCAL_ROUTING_ENABLED: AtomicBool = AtomicBool::new(true);

pub fn is_local_routing_enabled() -> bool {
    LOCAL_ROUTING_ENABLED.load(AtomicOrdering::Relaxed)
}

pub fn set_local_routing_enabled(enabled: bool) {
    LOCAL_ROUTING_ENABLED.store(enabled, AtomicOrdering::Relaxed);
}

/// Parse "8.8.8.8" or "8.8.8.8:53" into (`IpAddr`, port). Returns None if invalid.
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
    /// HTTPS-capable client for pass-through requests (and fallback).
    pub reqwest_client: reqwest::Client,
    route_service: Arc<LocalRouteService>,
    /// When set, pass-through hosts are resolved via this DNS server before forwarding.
    resolver: Option<Arc<TokioResolver>>,
    /// Forward proxy port (127.0.0.1:port). Set for reverse listeners so /.watchtower/proxy.pac can be generated.
    pub forward_proxy_port: Option<u16>,
    /// Same cert per host for TLS and for download (so installing the downloaded cert trusts the server).
    cert_cache: Arc<HostCertCache>,
    /// API logging service.
    pub api_log_service: Arc<ApiLogService>,
    /// 호스트명(소문자) → (logging_enabled, body_enabled)
    pub api_logging_map: Arc<std::sync::RwLock<HashMap<String, (bool, bool)>>>,
    /// API mocking service.
    pub api_mock_service: Arc<ApiMockService>,
}

impl ProxyState {
    fn new(
        route_service: Arc<LocalRouteService>,
        dns_server: Option<String>,
        forward_proxy_port: Option<u16>,
        api_log_service: Arc<ApiLogService>,
        api_logging_map: Arc<std::sync::RwLock<HashMap<String, (bool, bool)>>>,
        api_mock_service: Arc<ApiMockService>,
    ) -> Self {
    let reqwest_client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_default();
        let resolver = dns_server
            .as_ref()
            .and_then(|s| parse_dns_server(s))
            .map(|(ip, port)| {
                let config = ResolverConfig::from_parts(
                    None,
                    vec![],
                    NameServerConfigGroup::from_ips_clear(&[ip], port, true),
                );
                let r = Resolver::builder_with_config(config, TokioConnectionProvider::default())
                    .build();
                Arc::new(r)
            });
        Self {
        reqwest_client,
            route_service,
            resolver,
            forward_proxy_port,
            cert_cache: Arc::new(HostCertCache::new()),
            api_log_service,
            api_logging_map,
            api_mock_service,
        }
    }
}

/// Extract hostname from route domain: "<https://dev.modetour.local>/".to_string() -> "dev.modetour.local", "dev.modetour.local" -> "dev.modetour.local".
fn route_domain_to_host(domain: &str) -> &str {
    let domain = domain.trim();
    if let Some(after) = domain
        .strip_prefix("https://")
        .or_else(|| domain.strip_prefix("http://"))
    {
        let host_part = after.split('/').next().unwrap_or(after).trim();
        let host_only = host_part.split(':').next().unwrap_or(host_part).trim();
        return if host_only.is_empty() {
            domain
        } else {
            host_only
        };
    }
    let host_only = domain.split(':').next().unwrap_or(domain).trim();
    if host_only.is_empty() {
        domain
    } else {
        host_only
    }
}

/// True if route domain is scheme-specific (e.g. "https://..."). Used to prefer scheme-specific routes.
fn route_domain_scheme(domain: &str) -> Option<&'static str> {
    let d = domain.trim();
    if d.starts_with("https://") {
        return Some("https");
    }
    if d.starts_with("http://") {
        return Some("http");
    }
    None
}

/// (`target_uri_string`, `pass_through_host`, `target_host_header`, `local_origin`).
/// When local route matches, `local_origin` = `Some((target_host`, `target_port`, `path_and_query`))
/// so we can connect directly and send request in origin-form (GET /path HTTP/1.1).
/// Route domain can be hostname (dev.modetour.local) or URL (<https://dev.modetour.local>/); we match by host.
fn resolve_target(
    uri: &Uri,
    host_from_header: Option<&str>,
    routes: &[crate::model::local_route::LocalRoute],
    incoming_scheme: IncomingScheme,
) -> (
    String,
    Option<String>,
    Option<String>,
    Option<(String, u16, String)>,
) {
    let host = uri
        .authority()
        .map(axum::http::uri::Authority::host)
        .or(host_from_header)
        .unwrap_or("");
    let host_no_port = host.split(':').next().unwrap_or(host).trim();

    let path_query = uri
        .path_and_query()
        .map_or("/", axum::http::uri::PathAndQuery::as_str);

    // Prefer scheme from URI if present (absolute URI proxy request), else use incoming_scheme.
    let request_scheme = if let Some(s) = uri.scheme_str() {
        s
    } else {
        match incoming_scheme {
            IncomingScheme::Http => "http",
            IncomingScheme::Https => "https",
        }
    };

    // Collect matching routes (by normalized host); prefer scheme-specific (https for https request, etc.)
    let mut best: Option<&LocalRoute> = None;
    for r in routes {
        if !r.enabled {
            continue;
        }
        let route_host = route_domain_to_host(r.domain.as_str());
        if !route_host.eq_ignore_ascii_case(host_no_port) {
            continue;
        }
        let route_scheme = route_domain_scheme(r.domain.as_str());
        match (best, route_scheme) {
            (None, _) => best = Some(r),
            (Some(_prev), None) => { /* keep prev (more specific) */ } 
            (Some(prev), Some(rs)) => {
                let prev_scheme = route_domain_scheme(prev.domain.as_str());
                if prev_scheme.is_none() && rs == request_scheme {
                    best = Some(r); // prefer scheme-specific match
                } else if prev_scheme == Some(request_scheme) && rs != request_scheme {
                    /* keep prev */
                } else if rs == request_scheme {
                    best = Some(r);
                }
            }
        }
    }
    if let Some(r) = best {
        let path = path_query.to_string();
        return (
            format!("http://{}:{}{}", r.target_host, r.target_port, path_query), // FIXED: used proper format specifiers
            None,
            Some(r.target_host.clone()),
            Some((r.target_host.clone(), r.target_port, path)),
        );
    }

    // No hosts file: when Host is 127.0.0.1 or localhost, use first enabled route so
    // browser can open http://127.0.0.1:reverse_port and get the local app (which can show settings).
    let host_no_port = host.split(':').next().unwrap_or(host).trim();
    if (host_no_port.eq_ignore_ascii_case("127.0.0.1")
        || host_no_port.eq_ignore_ascii_case("localhost"))
        && !host_no_port.is_empty()
    {
        if let Some(r) = routes.iter().find(|r| r.enabled) {
            let path = path_query.to_string();
            return (
                format!("http://{}:{}{}", r.target_host, r.target_port, path_query), // FIXED: used proper format specifiers
                None,
                Some(r.target_host.clone()),
                Some((r.target_host.clone(), r.target_port, path)),
            );
        }
    }

    // Pass-through
    let target = if uri.scheme().is_some() && uri.authority().is_some() {
        uri.to_string()
    } else if let Some(h) = host_from_header {
        let scheme = uri.scheme_str().unwrap_or("http");
        format!("{scheme}://{}{}", h, path_query) // FIXED: used proper format specifiers
    } else {
        format!("http://{}{}", host, path_query) // FIXED: used proper format specifiers
    };
    (target, Some(host.to_string()), None, None)
}

/// For CONNECT host:port, if host matches a local route return `Some((target_host`, `target_port`)).
/// CONNECT is always HTTPS; prefer route whose domain is "https://..." when multiple match.
fn resolve_connect_target(host: &str, routes: &[LocalRoute]) -> Option<(String, u16)> {
    let host_no_port = host.split(':').next().unwrap_or(host).trim();
    let mut best: Option<&LocalRoute> = None;
    for r in routes {
        if !r.enabled {
            continue;
        }
        let route_host = route_domain_to_host(r.domain.as_str());
        if !route_host.eq_ignore_ascii_case(host_no_port) {
            continue;
        }
        let route_scheme = route_domain_scheme(r.domain.as_str());
        match (best, route_scheme) {
            (None, _) => best = Some(r),
            (Some(_prev), None) => { /* keep prev */ } 
            (Some(prev), Some(rs)) => {
                let prev_scheme = route_domain_scheme(prev.domain.as_str());
                if rs == "https" && prev_scheme != Some("https") {
                    best = Some(r); // prefer https-specific for CONNECT
                } else if prev_scheme == Some("https") && rs != "https" {
                    /* keep prev */
                } else {
                    best = Some(r);
                }
            }
        }
    }
    best.map(|r| (r.target_host.clone(), r.target_port))
}

/// Shared cache: same cert per host for both TLS and download (so installing the downloaded cert trusts the server).
struct HostCertCache {
    root_ca_rcgen_cert: rcgen::Certificate,
    root_ca_cert: Arc<CertifiedKey>,
    root_ca_key_pair: KeyPair,
    root_ca_pem: String,
    inner: std::sync::Mutex<HashMap<String, (Arc<CertifiedKey>, String)>>,
}

impl HostCertCache {
    fn new() -> Self {
        let root_ca_key_pair = KeyPair::generate().expect(r#"Failed to generate CA key pair"#);
        let mut params = CertificateParams::new(vec!["Watchtower CA".to_string()]).expect(r#"Failed to create CA cert params"#);
        params.is_ca = IsCa::Ca(BasicConstraints::Unconstrained);
        params.distinguished_name.push(DnType::OrganizationName, "Watchtower");
        params.distinguished_name.push(DnType::CommonName, "Watchtower CA");
        let now = OffsetDateTime::now_utc();
        params.not_before = now - Duration::days(1); // Valid from yesterday
        params.not_after = now + Duration::days(365 * 10); // Valid for 10 years

        let root_ca_rcgen_cert = params.self_signed(&root_ca_key_pair).expect(r#"Failed to self-sign CA certificate"#);
        let root_ca_pem = root_ca_rcgen_cert.pem();
        let root_ca_cert_der = CertificateDer::from(root_ca_rcgen_cert.der().as_ref().to_vec());
        let root_ca_private_key_der = root_ca_key_pair.serialize_der();
        let root_ca_private_key = PrivateKeyDer::try_from(root_ca_private_key_der).expect(r#"Failed to parse CA private key"#);
        let provider = rustls::crypto::ring::default_provider();
        let root_ca_signer = provider.key_provider.load_private_key(root_ca_private_key).expect(r#"Failed to load CA private key"#);
        
        let root_ca_cert = Arc::new(CertifiedKey::new(vec![root_ca_cert_der], root_ca_signer));

        Self {
            root_ca_rcgen_cert, // Storing the rcgen::Certificate object
            root_ca_cert,
            root_ca_key_pair,
            root_ca_pem,
            inner: std::sync::Mutex::new(HashMap::new()),
        }
    }

    /// Get or create (`CertifiedKey` for TLS, PEM for download). Same cert is used for both.
    /// Uses host as CN and reasonable validity (not 1975) so OS/browsers don't show extra warnings.
    fn get_or_create(&self, host: &str) -> Option<(Arc<CertifiedKey>, String)> {
        {
            let g = self.inner.lock().ok()?;
            if let Some((ck, pem)) = g.get(host) {
                return Some((Arc::clone(ck), pem.clone()));
            }
        }
        let key_pair = KeyPair::generate().ok()?;
        let mut params = CertificateParams::new(vec![host.to_string()]).ok()?;
        params.distinguished_name.push(DnType::CommonName, host);
        let now = OffsetDateTime::now_utc();
        params.not_before = now - Duration::days(1);
        params.not_after = now + Duration::days(365 * 10);

        // Sign certificate with our Root CA
        let cert = params.signed_by(&key_pair, &self.root_ca_rcgen_cert, &self.root_ca_key_pair).ok()?;
        let pem = cert.pem();
        let cert_der = CertificateDer::from(cert.der().as_ref().to_vec());
        let key_der = key_pair.serialize_der();
        let private_key = PrivateKeyDer::try_from(key_der).ok()?;
        let provider = rustls::crypto::ring::default_provider();
        let signer = provider.key_provider.load_private_key(private_key).ok()?;
        let ck = Arc::new(CertifiedKey::new(vec![cert_der], signer));
        {
            let mut g = self.inner.lock().ok()?;
            g.entry(host.to_string())
                .or_insert_with(|| (Arc::clone(&ck), pem.clone()));
            let (ck, pem) = g.get(host).unwrap();
            Some((Arc::clone(ck), pem.clone()))
        }
    }
}

/// Dynamic certificate resolver: uses shared `HostCertCache` so TLS and download serve the same cert.
struct DynamicCertResolver {
    cache: Arc<HostCertCache>,
}

impl std::fmt::Debug for DynamicCertResolver {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DynamicCertResolver")
            .finish_non_exhaustive()
    }
}

impl ResolvesServerCert for DynamicCertResolver {
    fn resolve(&self, client_hello: ClientHello<'_>) -> Option<Arc<CertifiedKey>> {
        let name = client_hello.server_name()?;
        let name_str = name.to_string();
        self.cache.get_or_create(&name_str).map(|(ck, _)| ck)
    }
}

/// Resolve hostname to an IPv4 or IPv6 address using the configured resolver. Returns first IP.
async fn resolve_host_via_dns(resolver: &TokioResolver, host: &str) -> Option<IpAddr> {
    let lookup = resolver.lookup_ip(host).await.ok()?;
    lookup.iter().next()
}

/// Wraps a `TcpStream` with a prepended buffer (e.g. first HTTP request) for re-injection.
struct PrependIo {
    buf: Cursor<Vec<u8>>,
    stream: TcpStream,
}

impl PrependIo {
    fn new(buf: Vec<u8>, stream: TcpStream) -> Self {
        Self {
            buf: Cursor::new(buf),
            stream,
        }
    }
}

impl AsyncRead for PrependIo {
    fn poll_read(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<std::io::Result<()>> {
        let buf_len = self.buf.get_ref().len();
        let pos = self.buf.position();
        if pos < buf_len as u64 {
            let remain = (buf_len as u64 - pos) as usize;
            let n = remain.min(buf.remaining());
            let start = pos as usize;
            buf.put_slice(&self.buf.get_ref()[start..start + n]);
            self.buf.set_position(pos + n as u64);
            return Poll::Ready(Ok(()));
        }
        AsyncRead::poll_read(std::pin::Pin::new(&mut self.stream), cx, buf)
    }
}

impl AsyncWrite for PrependIo {
    fn poll_write(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut Context<'_>,
        buf: &[u8],
    ) -> Poll<std::io::Result<usize>> {
        AsyncWrite::poll_write(std::pin::Pin::new(&mut self.stream), cx, buf)
    }
    fn poll_flush(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<std::io::Result<()>> {
        AsyncWrite::poll_flush(std::pin::Pin::new(&mut self.stream), cx)
    }
    fn poll_shutdown(
        mut self: std::pin::Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<std::io::Result<()>> {
        AsyncWrite::poll_shutdown(std::pin::Pin::new(&mut self.stream), cx)
    }
}

const MAX_HEADER_LEN: usize = 8192;

/// Read from stream until \r\n\r\n or max size. Returns the buffer.
async fn read_request_headers(stream: &mut TcpStream) -> std::io::Result<Vec<u8>> {
    let mut buf = Vec::with_capacity(1024);
    let mut search = 0usize;
    loop {
        if buf.len() >= MAX_HEADER_LEN {
            break Ok(buf);
        }
        let mut tmp = [0u8; 256];
        let n = AsyncReadExt::read(stream, &mut tmp).await?;
        if n == 0 {
            break Ok(buf);
        }
        buf.extend_from_slice(&tmp[..n]);
        while search + 3 < buf.len() {
            if buf[search] == b'\r'
                && buf[search + 1] == b'\n'
                && buf[search + 2] == b'\r'
                && buf[search + 3] == b'\n'
            {
                return Ok(buf);
            }
            search += 1;
        }
    }
}

/// Parse first line for CONNECT: "CONNECT host:port HTTP/1\.x" -> (host, port).
fn parse_connect_target(first_line: &str) -> Option<(String, u16)> {
    let first_line = first_line.trim();
    if !first_line.to_uppercase().starts_with("CONNECT ") {
        return None;
    }
    let rest = first_line
        .strip_prefix("CONNECT ")
        .unwrap_or(first_line)
        .trim();
    let authority = rest.split_whitespace().next()?;
    let (host, port_str) = authority.split_once(':').unwrap_or((authority, "443"));
    let port: u16 = port_str.parse().ok().unwrap_or(443);
    Some((host.to_string(), port))
}

/// Connect to host:port. If resolver is set, resolve host via DNS first.
async fn connect_for_connect(
    host: &str,
    port: u16,
    resolver: Option<&Arc<TokioResolver>>,
) -> std::io::Result<TcpStream> {
    let addr = if let Some(r) = resolver {
        if let Some(ip) = resolve_host_via_dns(r, host).await {
            SocketAddr::new(ip, port)
        } else {
            (host, port).to_socket_addrs().map_err(std::io::Error::other)?.next().ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "host not found"))?
        }
    } else {
        (host, port).to_socket_addrs().map_err(std::io::Error::other)?.next().ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, "host not found"))?
    };
    TcpStream::connect(addr).await
}

// ToSocketAddr for (host, port)
trait ToSocketAddr {
    fn to_socket_addr(&self) -> std::io::Result<SocketAddr>;
}
impl ToSocketAddr for (&str, u16) {
    fn to_socket_addr(&self) -> std::io::Result<SocketAddr> {
        use std::net::ToSocketAddrs;
        let (host, port) = *self;
        let mut addrs = (host, port).to_socket_addrs()?;
        addrs.next().ok_or_else(|| {
            std::io::Error::new(std::io::ErrorKind::NotFound, r#"could not resolve host"#)
        })
    }
}

/// TLS-terminate CONNECT and forward to the internal proxy app.
/// This allows logging, mocking, and local routing for HTTPS traffic.
async fn handle_connect_tunnel_decrypted(
    mut client: TcpStream,
    original_host: String,
    state: Arc<ProxyState>,
    header_buf: Vec<u8>,
) {
    let response = br#"HTTP/1.1 200 Connection Established\r\n\r\n"#;
    if client.write_all(response).await.is_err() {
        return;
    }
    let body_start = header_buf
        .windows(4)
        .position(|w| w == br#"\r\n\r\n"#)
        .map_or(header_buf.len(), |i| i + 4);
    let prepend = if body_start < header_buf.len() {
        header_buf[body_start..].to_vec()
    } else {
        vec![]
    };
    let config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_cert_resolver(Arc::new(DynamicCertResolver {
            cache: Arc::clone(&state.cert_cache),
        }));
    let acceptor = TlsAcceptor::from(Arc::new(config));
    let tls_stream = match acceptor.accept(PrependIo::new(prepend, client)).await {
        Ok(s) => s,
        Err(e) => {
            let msg = format!("{e:?}");
            if msg.contains("CertificateUnknown") || msg.contains("AlertReceived") {
                proxy_log!(r#"TLS failed for {}: client rejected our certificate"#, original_host);
            } else {
                proxy_log!("TLS accept failed for {}: {}", original_host, msg);
            }
            return;
        }
    };
    proxy_log!(r#"CONNECT {}: TLS terminated, forwarding to proxy_app"#, original_host);
    let io = TokioIo::new(tls_stream);

    let app = proxy_app(Arc::clone(&state)).layer(axum::middleware::from_fn(
        |mut req: Request, next: axum::middleware::Next| async move {
            req.extensions_mut().insert(IncomingScheme::Https);
            next.run(req).await
        },
    ));

    let svc = TowerToHyperService::new(app);
    let _ = Http1Builder::new().serve_connection(io, svc).await.ok();
}


async fn handle_connect_tunnel(
    mut client: TcpStream,
    host: String,
    port: u16,
    state: Arc<ProxyState>,
    header_buf: Vec<u8>,
) {
    proxy_log!("CONNECT {}:{}", host, port);
    let routes = if is_local_routing_enabled() {
        state.route_service.get_enabled()
    } else {
        vec![]
    };

    let host_no_port = host.split(':').next().unwrap_or(&host);
    let logging_enabled = {
        let map = state.api_logging_map.read().unwrap();
        map.get(&host_no_port.to_ascii_lowercase())
            .map(|(l, _)| *l)
            .unwrap_or(false)
    };

    if resolve_connect_target(&host, &routes).is_some() || logging_enabled {
        proxy_log!("-> CONNECT TLS termination for {}", host);
        handle_connect_tunnel_decrypted(client, host, state, header_buf).await;
        return;
    }
    proxy_log!("-> CONNECT pass-through (upstream)");
    let mut upstream = match connect_for_connect(&host, port, state.resolver.as_ref()).await {
        Ok(s) => {
            proxy_log!("-> CONNECT pass-through: Successfully connected to upstream {}:{}", host, port);
            s
        },
        Err(e) => {
            proxy_log!("-> CONNECT pass-through: Failed to connect to upstream {}:{} - Error: {:?}", host, port, e);
            let _ = client
                .write_all(
                    br#"HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Length: 0\r\n\r\n"#,
                )
                .await;
            return;
        }
    };
    let response = br#"HTTP/1.1 200 Connection Established\r\n\r\n"#;
    if let Err(e) = client.write_all(response).await {
        proxy_log!("-> CONNECT pass-through: Failed to write 200 OK to client - Error: {:?}", e);
        return;
    }
    proxy_log!("-> CONNECT pass-through: Sent 200 OK to client.");

    let body_start = header_buf
        .windows(4)
        .position(|w| w == br#"\r\n\r\n"#)
        .map_or(header_buf.len(), |i| i + 4);
    if body_start < header_buf.len() {
        if let Err(e) = upstream.write_all(&header_buf[body_start..]).await {
            proxy_log!("-> CONNECT pass-through: Failed to write buffered data to upstream - Error: {:?}", e);
        } else {
            proxy_log!("-> CONNECT pass-through: Wrote buffered data to upstream ({} bytes).", header_buf[body_start..].len());
        }
    }
    let (mut client_r, mut client_w) = client.into_split();
    let (mut up_r, mut up_w) = upstream.into_split();
    
    proxy_log!("-> CONNECT pass-through: Spawning tokio::io::copy tasks for client-upstream data transfer.");
    let t1 = tokio::spawn(async move {
        let res = tokio::io::copy(&mut client_r, &mut up_w).await;
        proxy_log!("-> CONNECT pass-through: Client to Upstream copy finished with {:?}", res);
        res
    });
    let t2 = tokio::spawn(async move {
        let res = tokio::io::copy(&mut up_r, &mut client_w).await;
        proxy_log!("-> CONNECT pass-through: Upstream to Client copy finished with {:?}", res);
        res
    });
    // Await the completion of both tasks and log potential errors
    match tokio::try_join!(t1, t2) {
        Ok(_) => proxy_log!("-> CONNECT pass-through: Data transfer tasks finished successfully."),
        Err(e) => proxy_log!("-> CONNECT pass-through: Data transfer tasks finished with error: {:?}", e),
    }
}

/// Reserved path prefix: proxy serves setup page and assets (no forward to local route).
const WATCHTOWER_PATH_PREFIX: &str = "/.watchtower/";

/// PAC (Proxy Auto-Config) JavaScript. When `forward_proxy_port` is set, routes local-route domains via proxy; else DIRECT.
fn build_pac_js(forward_port: u16, domains: &[LocalRoute]) -> String {
    let proxy = format!("PROXY 127.0.0.1:{forward_port}");
    if domains.is_empty() {
        return format!("function FindProxyForURL(url, host) {{ return \"{proxy}\"; }}");
    }
    let quoted: Vec<String> = domains
        .iter()
        .map(|r| {
            let esc = r.domain.replace('\\', "\\\\").replace('"', "\"");
            format!("\"{esc}\"")
        })
        .collect();
    let list_js = quoted.join(", ");
    format!(
        r###"function FindProxyForURL(url, host) {{
  var domains = [{list_js}];
  for (var i = 0; i < domains.length; i++) {{
    if (host === domains[i] || host.endsWith("." + domains[i])) return \"{proxy}\";
  }}
  return \"DIRECT\";}}"###
    )
}

async fn serve_watchtower_reserved_path(state: Arc<ProxyState>, path: &str) -> Response {
    if path == "/.watchtower/proxy.pac" || path.starts_with("/.watchtower/proxy.pac") {
        let Some(port) = state.forward_proxy_port else { 
            return (StatusCode::NOT_FOUND, "Forward proxy port not configured").into_response();
        };
        let routes = state.route_service.get_enabled();
        let pac = build_pac_js(port, &routes);
        return (
            StatusCode::OK,
            [(
                CONTENT_TYPE,
                HeaderValue::from_static("application/x-ns-proxy-autoconfig"),
            )],
            pac,
        )
            .into_response();
    }
    if path == "/.watchtower/setup" || path.starts_with("/.watchtower/setup") {
        let proxy_port_msg = state
            .forward_proxy_port
            .map(|p| format!(" (Forward proxy: 127.0.0.1:{p})"))
            .unwrap_or_default();
        let port = state.forward_proxy_port.unwrap_or(0);
        let html = include_str!("../../resources/setup.html")
            .replace("%PROXY_PORT_MSG%", &proxy_port_msg)
            .replace("%PROXY_PORT%", &port.to_string());
        return Html(html).into_response();
    }
    if path == "/.watchtower/cert/ca.crt" {
        return serve_ca_cert_pem(Arc::clone(&state)).into_response();
    }
    if path.starts_with("/.watchtower/cert/") {
        let host = path.trim_start_matches("/.watchtower/cert/").trim();
        if host.is_empty() {
            return (
                StatusCode::BAD_REQUEST,
                "Missing host in path: /.watchtower/cert/<host>",
            )
                .into_response();
        }
        return serve_cert_pem(Arc::clone(&state), host).into_response();
    }
    (StatusCode::NOT_FOUND, "Not found").into_response()
}

// Helper to serve the Root CA certificate
fn serve_ca_cert_pem(state: Arc<ProxyState>) -> Response {
    let filename = "watchtower-ca.crt".to_string();
    let disposition = format!("attachment; filename=\"{filename}\"",);
    (
        StatusCode::OK,
        [
            (
                CONTENT_TYPE,
                HeaderValue::from_static("application/x-pem-file"),
            ),
            (
                axum::http::header::CONTENT_DISPOSITION,
                HeaderValue::try_from(disposition)
                    .unwrap_or(HeaderValue::from_static("attachment")),
            ),
        ],
        state.cert_cache.root_ca_pem.clone(),
    )
        .into_response()
}

/// Return PEM for download. Uses the same cert as TLS for this host (from shared cache) so installing it trusts the server.
fn serve_cert_pem(state: Arc<ProxyState>, host: &str) -> Response {
    let Some((_, pem)) = state.cert_cache.get_or_create(host) else { 
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to generate certificate",
        )
            .into_response();
    };
    // .crt 확장자로 내려주면 Windows에서 더블클릭 시 인증서 설치 마법사가 뜸 (.pem은 연결 프로그램 없음)
    let filename = format!("watchtower-{}.crt", host.replace(['.', ':'], "-"));
    let disposition = format!("attachment; filename=\"{filename}\"",);
    (
        StatusCode::OK,
        [
            (
                CONTENT_TYPE,
                HeaderValue::from_static("application/x-pem-file"),
            ),
            (
                axum::http::header::CONTENT_DISPOSITION,
                HeaderValue::try_from(disposition)
                    .unwrap_or(HeaderValue::from_static("attachment")),
            ),
        ],
        pem,
    )
        .into_response()
}

async fn proxy_handler(State(state): State<Arc<ProxyState>>, mut req: Request) -> Response {
    let incoming_scheme = req
        .extensions()
        .get::<IncomingScheme>()
        .copied()
        .unwrap_or(IncomingScheme::Http);

    let method = req.method().clone();
    let uri = req.uri().clone();
    let path = uri.path().to_string();
    let path_query = uri
        .path_and_query()
        .map_or("/", axum::http::uri::PathAndQuery::as_str);
    let host_h = req
        .headers()
        .get("host")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_default();
    proxy_log!("-> Incoming Request: {} {} Host: {}", method, uri, host_h);
    proxy_log!("   Headers:");
    for (name, value) in req.headers() {
        proxy_log!("      {}: {}", name, value.to_str().unwrap_or("???"));
    }

    let original_full_url = if uri.scheme().is_some() && uri.authority().is_some() {
        uri.to_string()
    } else {
        let scheme_str = match incoming_scheme {
            IncomingScheme::Http => "http",
            IncomingScheme::Https => "https",
        };
        format!("{scheme_str}://{}{path_query}", host_h)
    };

    // Check logging config for this host to decide if we should read body for logging
    let host_for_logging_decision = host_h.split(':').next().unwrap_or(&host_h);
    let logging_config_decision = {
        let map = state.api_logging_map.read().unwrap();
        map.get(&host_for_logging_decision.to_ascii_lowercase()).copied()
    };

    let mut captured_incoming_body_bytes: Option<Vec<u8>> = None;
    let (parts, incoming_body_axum) = req.into_parts(); // Consume req once here

    if let Some((true, true)) = logging_config_decision {
        // Read the body for logging
        let bytes = axum::body::to_bytes(incoming_body_axum, 1024 * 1024 * 10).await.unwrap_or_default();
        proxy_log!("-> Incoming Request Body for {}: {}", method, uri);
        proxy_log!("   Body ({} bytes): {}", bytes.len(), String::from_utf8_lossy(&bytes));
        captured_incoming_body_bytes = Some(bytes.to_vec()); // Convert Bytes to Vec<u8>
        req = Request::from_parts(parts, Body::from(captured_incoming_body_bytes.clone().unwrap_or_default())); // Rebuild req
    } else {
        req = Request::from_parts(parts, incoming_body_axum); // Rebuild req with original body
    }

    // --- Mock logic start ---
    let host_for_mock = if !host_h.is_empty() {
        host_h.split(':').next().unwrap_or(&host_h)
    } else {
        uri.authority().map(|a| a.host()).unwrap_or("")
    };

    if let Some(mock) = state
        .api_mock_service
        .match_mock(host_for_mock, path_query, method.as_str())
    {
        proxy_log!("-> MOCK match for {} {}", method, uri);

        let status = StatusCode::from_u16(mock.status_code).unwrap_or(StatusCode::OK);
        let response_body = mock.response_body.clone();

        // Also log if enabled
        let logging_config = {
            let map = state.api_logging_map.read().unwrap();
            map.get(&host_for_mock.to_ascii_lowercase()).copied()
        };

        if let Some((true, _)) = logging_config {
            let mut req_headers_map = HashMap::new();
            for (name, value) in req.headers() {
                req_headers_map.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
            }

            let entry = ApiLogEntry {
                id: format!("{}-{}", chrono::Utc::now().timestamp_micros(), 0),
                timestamp: chrono::Utc::now().timestamp_millis(),
                method: method.to_string(),
                url: uri.to_string(),
                host: host_for_mock.to_string(),
                path: path_query.to_string(),
                status_code: mock.status_code,
                request_headers: req_headers_map,
                request_body: None,
                response_headers: [("content-type".to_string(), "application/json".to_string())]
                    .into_iter()
                    .collect(),
                response_body: Some(response_body.clone()),
                source: "mock".to_string(),
                elapsed_ms: 0,
            };
            state.api_log_service.add_log(entry);
        }

        let content_type = if mock.content_type.is_empty() {
            "application/json"
        } else {
            &mock.content_type
        };

        return Response::builder()
            .status(status)
            .header(CONTENT_TYPE, content_type)
            .body(Body::from(response_body))
            .unwrap()
            .into_response();
    }
    // --- Mock logic end ---

    if path.starts_with(WATCHTOWER_PATH_PREFIX) {
        proxy_log!("-> watchtower reserved: {}", path);
        return serve_watchtower_reserved_path(state, &path).await;
    }

    let mut req = req;

    let host_header = req
        .headers()
        .get("host")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    // When local routing is disabled, pass an empty slice so no routes match → pure pass-through.
    let routes = if is_local_routing_enabled() {
        state.route_service.get_enabled()
    } else {
        vec![]
    };
    let (mut target_uri_str, pass_through_host, target_host_value, local_origin) =
        resolve_target(&uri, host_header.as_deref(), &routes, incoming_scheme);

    if let Some((ref target_host, target_port, ref path_query)) = local_origin {
        proxy_log!(
            "-> local route -> {}:{}{}",
            target_host,
            target_port,
            path_query
        );
        let addr = match (target_host.as_str(), target_port).to_socket_addrs() {
            Ok(mut addrs) => match addrs.next() {
                Some(a) => a,
                None => {
                    return (StatusCode::BAD_GATEWAY, "Invalid target host").into_response();
                }
            },
            Err(_) => {
                return (StatusCode::BAD_GATEWAY, "Invalid target host").into_response();
            }
        };
        let stream = match TcpStream::connect(addr).await {
            Ok(s) => s,
            Err(e) => {
                return (StatusCode::BAD_GATEWAY, format!("Connection failed: {}", e)) // FIXED: format specifier
                    .into_response();
            }
        };
        let io = TokioIo::new(stream);
        let (mut sender, conn) = match client_handshake(io).await {
            Ok(x) => x,
            Err(e) => {
                return (StatusCode::BAD_GATEWAY, format!("Handshake failed: {}", e)).into_response(); // FIXED: format specifier
            }
        };
        tokio::spawn(async move { conn.await.ok() });
        let Ok(path_uri) = path_query.parse::<Uri>() else { 
            return (StatusCode::BAD_REQUEST, "Invalid path").into_response();
        };
        // Keep original Host (e.g. dev.modetour.local) so the backend can do vhost routing; fallback to target_host:port.
        let host_value = host_header
            .as_deref()
            .and_then(|h| HeaderValue::try_from(h).ok())
            .unwrap_or_else(|| {
                let fallback = format!("{target_host}:{target_port}");
                HeaderValue::try_from(fallback.as_str())
                    .unwrap_or(HeaderValue::from_static("127.0.0.1:3100"))
            });
        let host_sent = host_value.to_str().unwrap_or("?").to_string();
        proxy_log!(
            "   connecting to {}:{} sending Host: {}",
            target_host,
            target_port,
            host_sent
        );
        req.headers_mut().insert("host", host_value);
        *req.uri_mut() = path_uri;

        // --- Debug Logging for Local Route Outgoing Request ---
        proxy_log!("-> Outgoing Local Route Request Headers for {}: {}", method, req.uri());
        for (name, value) in req.headers() {
            proxy_log!("   Outgoing Header: {}: {}", name, value.to_str().unwrap_or("???"));
        }
        if let Some(body_bytes) = &captured_incoming_body_bytes {
            proxy_log!("-> Outgoing Local Route Request Body for {}: {}", method, req.uri());
            proxy_log!("   Body ({} bytes): {}", body_bytes.len(), String::from_utf8_lossy(body_bytes));
        }

        // --- Logging logic start (for ApiLogEntry) ---
        let host_for_logging = host_header.as_deref().unwrap_or(&host_sent);
        let logging_config = {
            let map = state.api_logging_map.read().unwrap();
            map.get(&host_for_logging.to_ascii_lowercase()).copied()
        };

        let mut request_body_bytes = None;
        let mut req_headers_map = HashMap::new();
        if let Some((logging_enabled, body_enabled)) = logging_config {
            if logging_enabled {
                for (name, value) in req.headers() {
                    req_headers_map.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
                }
                if body_enabled {
                    let (parts, body) = req.into_parts();
                    let bytes = axum::body::to_bytes(Body::new(body), 1024 * 1024 * 10).await.unwrap_or_default();
                    request_body_bytes = Some(bytes.clone());
                    req = Request::from_parts(parts, Body::from(bytes));
                }
            }
        }
        // --- Logging logic end ---

        let start = std::time::Instant::now();
        match sender.send_request(req).await {
            Ok(res) => {
                let status = res.status();
                let elapsed = start.elapsed().as_millis() as u64;
                proxy_log!(
                    "   backend response {} {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("")
                );

                if let Some((true, body_enabled)) = logging_config {
                    let (parts_res_hyper, body_res_hyper) = res.into_parts(); // Renamed for clarity, from reqwest::Response
                    let mut res_headers_map = HashMap::new();
                    for (name, value) in &parts_res_hyper.headers { // FIXED: Use renamed parts
                        res_headers_map.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
                    }

                    let mut response_body_bytes = None;
                    let final_body = if body_enabled {
                        let bytes = axum::body::to_bytes(Body::new(body_res_hyper), 1024 * 1024 * 10).await.unwrap_or_default();
                        response_body_bytes = Some(bytes.clone());
                        Body::from(bytes)
                    } else {
                        Body::new(body_res_hyper)
                    };

                    let entry = ApiLogEntry {
                        id: format!("{}-{}", chrono::Utc::now().timestamp_micros(), 0),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                        method: method.to_string(),
                        url: original_full_url.clone(),
                        host: host_for_logging.to_string(),
                        path: path_query.to_string(),
                        status_code: status.as_u16(),
                        request_headers: req_headers_map,
                        request_body: request_body_bytes.map(|b| String::from_utf8_lossy(&b).to_string()),
                        response_headers: res_headers_map,
                        response_body: response_body_bytes.map(|b| String::from_utf8_lossy(&b).to_string()),
                        source: "proxy".to_string(),
                        elapsed_ms: elapsed,
                    };
                    state.api_log_service.add_log(entry);

                    Response::from_parts(parts_res_hyper, final_body) // This still causes issues
                } else {
                    let (parts_res_hyper, body_res_hyper) = res.into_parts();
                    Response::from_parts(parts_res_hyper, Body::new(body_res_hyper))
                }
            }
            Err(e) => (StatusCode::BAD_GATEWAY, format!("Proxy error: {}", e)).into_response(), // FIXED: format specifier
        }
    } else {
        proxy_log!("-> Entering pass-through section. Target URI: {}", target_uri_str);
        // Pass-through or non-local: use shared client (absolute URI).
        if let Some(ref host) = target_host_value {
            if let Ok(hv) = HeaderValue::try_from(host.as_str()) {
                req.headers_mut().insert("host", hv);
            }
        }

        if let Some(host) = pass_through_host.as_deref() {
            if !host.is_empty() {
                if let Some(resolver) = state.resolver.as_ref() {
                    if let Some(ip) = resolve_host_via_dns(resolver, host).await {
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
                                .map_or("/", axum::http::uri::PathAndQuery::as_str);
                            target_uri_str = format!("{scheme}://{}:{}{}", ip, port, path_query); // FIXED: format specifiers
                        }
                    }
                }
            }
        }

        let Ok(target_url) = reqwest::Url::parse(&target_uri_str) else { 
            return (StatusCode::BAD_REQUEST, "Invalid target URI").into_response();
        };
        proxy_log!("-> Pass-through: Final target URL for reqwest: {}", target_url);

        // --- Logging logic start ---
        let host_for_logging = host_header
            .as_deref()
            .unwrap_or(pass_through_host.as_deref().unwrap_or(""));
        let logging_config = {
            let map = state.api_logging_map.read().unwrap();
            map.get(&host_for_logging.to_ascii_lowercase()).copied()
        };

        let mut request_body_bytes = None;
        let mut req_headers_map = HashMap::new();

        let (mut parts_req, body_req) = req.into_parts(); // Consume req here

        if let Some((logging_enabled, _)) = logging_config {
            if logging_enabled {
                for (name, value) in &parts_req.headers {
                    req_headers_map.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
                }
            }
        }
        
        let mut rb = state
            .reqwest_client
            .request(parts_req.method.clone(), target_url);
        for (name, value) in &parts_req.headers {
            // Reqwest handles these headers or they should not be forwarded directly
            let name_s = name.as_str().to_lowercase();
            if name_s != "host"
                && name_s != "connection"
                && name_s != "keep-alive"
                && name_s != "proxy-connection"
                && name_s != "transfer-encoding"
                && name_s != "upgrade"
            {
                rb = rb.header(name, value);
            }
        }

        let final_req_body = if let Some((logging_enabled, body_enabled)) = logging_config {
            if logging_enabled && body_enabled {
                let bytes = axum::body::to_bytes(body_req, 1024 * 1024 * 10)
                    .await
                    .unwrap_or_default();
                request_body_bytes = Some(bytes.clone());
                reqwest::Body::from(bytes)
            } else {
                reqwest::Body::wrap_stream(Body::from(body_req).into_data_stream())
            }
        } else {
            reqwest::Body::wrap_stream(Body::from(body_req).into_data_stream())
        };
        // --- Logging logic end ---

        let start = std::time::Instant::now();
        match rb.body(final_req_body).send().await {
            Ok(res) => {
                let status = res.status();
                let elapsed = start.elapsed().as_millis() as u64;
                proxy_log!(
                    "   backend response {} {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("")
                );
                proxy_log!("-> Pass-through: Received upstream response status: {}", status);
                proxy_log!("-> Pass-through: Received upstream response headers:");
                for (name, value) in res.headers() {
                    proxy_log!("      {}: {}", name, value.to_str().unwrap_or("???"));
                }

                let headers = res.headers().clone(); // Clone headers for later use
                let response_body_bytes_all = res.bytes().await.unwrap_or_default(); // Read the entire body into Bytes

                let mut res_headers_map = HashMap::new();
                for (name, value) in &headers {
                    res_headers_map.insert(name.to_string(), value.to_str().unwrap_or("").to_string());
                }

                if let Some((true, body_enabled)) = logging_config {
                    let response_body_for_log = if body_enabled {
                        Some(String::from_utf8_lossy(&response_body_bytes_all).to_string())
                    } else {
                        None
                    };

                    let entry = ApiLogEntry {
                        id: format!("{}-{}", chrono::Utc::now().timestamp_micros(), 0),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                        method: method.to_string(),
                        url: original_full_url.clone(),
                        host: host_for_logging.to_string(),
                        path: uri.path().to_string(),
                        status_code: status.as_u16(),
                        request_headers: req_headers_map,
                        request_body: request_body_bytes.map(|b| String::from_utf8_lossy(&b).to_string()),
                        response_headers: res_headers_map,
                        response_body: response_body_for_log,
                        source: "proxy".to_string(),
                        elapsed_ms: elapsed,
                    };
                    state.api_log_service.add_log(entry);
                }

                // Build axum::Response
                let mut builder = Response::builder().status(status);
                for (k, v) in &headers {
                    builder = builder.header(k, v.clone());
                }
                let axum_response = builder.body(Body::from(response_body_bytes_all)).unwrap();
                proxy_log!("-> Pass-through: Built axum response status: {}", axum_response.status());
                proxy_log!("-> Pass-through: Built axum response headers:");
                for (name, value) in axum_response.headers() {
                    proxy_log!("      {}: {}", name, value.to_str().unwrap_or("???"));
                }
                axum_response
            }
            Err(e) => (StatusCode::BAD_GATEWAY, format!("Proxy error: {}", e)).into_response(), // FIXED: format specifier
        }
    }
}

/// Build shared app (Router + state) for `proxy_handler`. Used by forward proxy and reverse listeners.
fn proxy_app(state: Arc<ProxyState>) -> Router {
    Router::new()
        .route("/*path", any(proxy_handler))
        .with_state(state)
}

/// Bind to 127.0.0.1:port and run the proxy. Returns the `JoinHandle` so the caller can abort it.
/// Handles CONNECT (HTTPS tunnel) and regular HTTP; when `dns_server` is set, pass-through hosts are resolved via it.
pub async fn run_proxy(
    port: u16,
    bind_all: bool,
    route_service: Arc<LocalRouteService>,
    dns_server: Option<String>,
    api_log_service: Arc<ApiLogService>,
    api_logging_map: Arc<std::sync::RwLock<HashMap<String, (bool, bool)>>>,
    api_mock_service: Arc<ApiMockService>,
) -> std::io::Result<JoinHandle<()>> {
    let ip = if bind_all { [0, 0, 0, 0] } else { [127, 0, 0, 1] };
    let addr = SocketAddr::from((ip, port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let state = Arc::new(ProxyState::new(
        route_service,
        dns_server,
        Some(port),
        api_log_service,
        api_logging_map,
        api_mock_service,
    ));
    let app = proxy_app(Arc::clone(&state));

    let handle = tokio::spawn(async move {
        loop {
            let Ok((stream, _)) = listener.accept().await else { 
                continue;
            };
            let state = Arc::clone(&state);
            let app = app.clone();
            tokio::spawn(async move {
                let mut stream = stream;
                let Ok(buf) = read_request_headers(&mut stream).await else { 
                    return;
                };
                let first_line = buf
                    .splitn(2, |&c| c == b'\n')
                    .next()
                    .and_then(|line| std::str::from_utf8(line).ok())
                    .unwrap_or("")
                    .trim_end_matches('\r')
                    .trim();
                if let Some((host, port)) = parse_connect_target(first_line) {
                    handle_connect_tunnel(stream, host, port, state, buf).await;
                } else {
                    let io = TokioIo::new(PrependIo::new(buf, stream));
                    let svc = TowerToHyperService::new(app);
                    let _ = Http1Builder::new().serve_connection(io, svc).await.ok();
                }
            });
        }
    });

    Ok(handle)
}

/// Reverse HTTP listener: no system proxy. Client connects directly (e.g. hosts 127.0.0.1 dev.modetour.local, then http://dev.modetour.local:port).
/// Requests are origin-form (GET /path); routing by Host header.
/// `forward_proxy_port`: port of the main (forward) proxy, for PAC generation.
pub async fn run_reverse_proxy_http(
    port: u16,
    bind_all: bool,
    route_service: Arc<LocalRouteService>,
    dns_server: Option<String>,
    forward_proxy_port: Option<u16>,
    api_log_service: Arc<ApiLogService>,
    api_logging_map: Arc<std::sync::RwLock<HashMap<String, (bool, bool)>>>,
    api_mock_service: Arc<ApiMockService>,
) -> std::io::Result<JoinHandle<()>> {
    let ip = if bind_all { [0, 0, 0, 0] } else { [127, 0, 0, 1] };
    let addr = SocketAddr::from((ip, port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let state = Arc::new(ProxyState::new(
        route_service,
        dns_server,
        forward_proxy_port,
        api_log_service,
        api_logging_map,
        api_mock_service,
    ));
    let app = proxy_app(Arc::clone(&state));

    let handle = tokio::spawn(async move {
        loop {
            let Ok((stream, _)) = listener.accept().await else { 
                continue;
            };
            let app = app.clone();
            tokio::spawn(async move {
                let io = TokioIo::new(stream);
                let svc = TowerToHyperService::new(app);
                let _ = Http1Builder::new().serve_connection(io, svc).await.ok();
            });
        }
    });

    Ok(handle)
}

/// Reverse HTTPS listener: TLS termination by Host (SNI), then forward by Host. Use https://dev.modetour.local:port with hosts.
/// `forward_proxy_port`: port of the main (forward) proxy, for PAC generation.
pub async fn run_reverse_proxy_https(
    port: u16,
    bind_all: bool,
    route_service: Arc<LocalRouteService>,
    dns_server: Option<String>,
    forward_proxy_port: Option<u16>,
    api_log_service: Arc<ApiLogService>,
    api_logging_map: Arc<std::sync::RwLock<HashMap<String, (bool, bool)>>>,
    api_mock_service: Arc<ApiMockService>,
) -> std::io::Result<JoinHandle<()>> {
    let ip = if bind_all { [0, 0, 0, 0] } else { [127, 0, 0, 1] };
    let addr = SocketAddr::from((ip, port));
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let state = Arc::new(ProxyState::new(
        route_service,
        dns_server,
        forward_proxy_port,
        api_log_service,
        api_logging_map,
        api_mock_service,
    ));
    let app = proxy_app(Arc::clone(&state));
    let config = rustls::ServerConfig::builder()
        .with_no_client_auth()
        .with_cert_resolver(Arc::new(DynamicCertResolver {
            cache: Arc::clone(&state.cert_cache),
        }));
    let acceptor = TlsAcceptor::from(Arc::new(config));

    let handle = tokio::spawn(async move {
        loop {
            let Ok((stream, _)) = listener.accept().await else { 
                continue;
            };
            let acceptor = acceptor.clone();
            let app = app.clone();
            tokio::spawn(async move {
                let Ok(tls_stream) = acceptor.accept(stream).await else { 
                    return;
                };
                let io = TokioIo::new(tls_stream);
                let svc = TowerToHyperService::new(app);
                let _ = Http1Builder::new().serve_connection(io, svc).await.ok();
            });
        }
    });

    Ok(handle)
}

// ═══════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════
#[cfg(test)]
mod tests {
    use super::*;
    use crate::model::local_route::LocalRoute;

    // ── LOCAL_ROUTING_ENABLED toggle ───────────────────────────────────
    #[test]
    fn test_local_routing_toggle() {
        // Reset to known state
        set_local_routing_enabled(true);
        assert!(is_local_routing_enabled());

        set_local_routing_enabled(false);
        assert!(!is_local_routing_enabled());

        set_local_routing_enabled(true);
        assert!(is_local_routing_enabled());
    }

    // ── resolve_target: empty routes → pure pass-through ───────────────
    #[test]
    fn test_resolve_target_empty_routes_passthrough() {
        let uri: Uri = "http://example.com/path?q=1".parse().unwrap();
        let (target_uri, _pass_host, _target_host_value, local_origin) =
            resolve_target(&uri, Some("example.com"), &[], IncomingScheme::Http);

        // No local route matched → local_origin is None
        assert!(local_origin.is_none(), "empty routes should yield no local_origin");
        // Target URI is the original (pass-through)
        assert!(
            target_uri.contains("example.com"),
            "pass-through target should contain original host, got: {target_uri}"
        );
    }

    // ── resolve_target: matching route → local routing ─────────────────
    #[test]
    fn test_resolve_target_with_matching_route() {
        let route = LocalRoute {
            id: 1,
            domain: "api.example.com".to_string(),
            target_host: "127.0.0.1".to_string(),
            target_port: 3000,
            enabled: true,
        };
        let uri: Uri = "http://api.example.com/foo".parse().unwrap();
        let (_target_uri, _pass_host, _target_host_value, local_origin) =
            resolve_target(&uri, Some("api.example.com"), &[route], IncomingScheme::Http);

        assert!(local_origin.is_some(), "matching route should yield local_origin");
        let (host, port, path) = local_origin.unwrap();
        assert_eq!(host, "127.0.0.1");
        assert_eq!(port, 3000);
        assert_eq!(path, "/foo");
    }

    // ── resolve_target: disabled route should NOT match ─────────────────
    #[test]
    fn test_resolve_target_disabled_route_no_match() {
        let route = LocalRoute {
            id: 1,
            domain: "api.example.com".to_string(),
            target_host: "127.0.0.1".to_string(),
            target_port: 3000,
            enabled: false,
        };
        let uri: Uri = "http://api.example.com/foo".parse().unwrap();
        let (_target_uri, _pass_host, _target_host_value, local_origin) =
            resolve_target(&uri, Some("api.example.com"), &[route], IncomingScheme::Http);

        assert!(
            local_origin.is_none(),
            "disabled route should not match"
        );
    }

    // ── resolve_connect_target: empty routes ────────────────────────────
    #[test]
    fn test_resolve_connect_target_empty_routes() {
        let result = resolve_connect_target("api.example.com", &[]);
        assert!(result.is_none(), "empty routes should return None for CONNECT");
    }

    // ── resolve_connect_target: matching route ──────────────────────────
    #[test]
    fn test_resolve_connect_target_matching_route() {
        let route = LocalRoute {
            id: 1,
            domain: "api.example.com".to_string(),
            target_host: "127.0.0.1".to_string(),
            target_port: 3000,
            enabled: true,
        };
        let result = resolve_connect_target("api.example.com", &[route]);
        assert!(result.is_some());
        let (host, port) = result.unwrap();
        assert_eq!(host, "127.0.0.1");
        assert_eq!(port, 3000);
    }

    // ── local routing flag integration with resolve_target ──────────────
    #[test]
    fn test_routing_flag_integration() {
        let route = LocalRoute {
            id: 1,
            domain: "dev.local".to_string(),
            target_host: "127.0.0.1".to_string(),
            target_port: 8080,
            enabled: true,
        };
        let uri: Uri = "http://dev.local/api".parse().unwrap();

        // Enabled: route should match
        set_local_routing_enabled(true);
        let routes_enabled = if is_local_routing_enabled() {
            vec![route.clone()]
        } else {
            vec![]
        };
        let (_, _, _, local_origin) =
            resolve_target(&uri, Some("dev.local"), &routes_enabled, IncomingScheme::Http);
        assert!(local_origin.is_some(), "routing enabled → should match");

        // Disabled: same route, but we pass empty vec (mimicking proxy_handler logic)
        set_local_routing_enabled(false);
        let routes_disabled = if is_local_routing_enabled() {
            vec![route]
        } else {
            vec![]
        };
        let (_, _, _, local_origin) =
            resolve_target(&uri, Some("dev.local"), &routes_disabled, IncomingScheme::Http);
        assert!(local_origin.is_none(), "routing disabled → should pass through");

        // Cleanup
        set_local_routing_enabled(true);
    }
}