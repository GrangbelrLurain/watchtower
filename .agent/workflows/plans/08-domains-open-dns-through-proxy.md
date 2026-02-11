---
description: domains 등록 도메인 열 때 설정의 DNS 서버를 통한 인터넷 창 열기 — 가능 여부 및 구현 방안
---

# Domains 열 때 DNS 서버를 통한 브라우저 열기

domains에 등록된 도메인을 열 때, **설정에 있는 DNS 서버**를 통해 인터넷 창이 열리도록 할 수 있는지 검토한 문서입니다.

**관련 문서**: [06-proxy-architecture.md](06-proxy-architecture.md), [05-domain-local-routing.md](05-domain-local-routing.md), [07-proxy-setup-page-feasibility.md](07-proxy-setup-page-feasibility.md)

---

## 1. 현재 구조 정리

| 구분 | 위치 | 동작 |
|------|------|------|
| **domains에서 URL 열기** | `DomainRow` (`src/features/domains-list/ui/DomainRow.tsx`) | `<a href={domain.url} target="_blank">` 링크. 클릭 시 **시스템 기본 브라우저**로 열림. |
| **Status Logs에서 URL 열기** | `src/routes/domains/status/logs.tsx` | `window.open(url, "_blank")` 로 새 탭 열기. |
| **설정의 DNS 서버** | Settings → `proxy_settings.json` | `dns_server` (예: `8.8.8.8`, `1.1.1.1:53`). |
| **DNS 사용처** | BE | (1) **로컬 프록시** pass-through (라우트에 없는 호스트 해석). (2) **domain status check** HTTP 요청. |

브라우저는 별도 프로세스이므로, 앱이 직접 브라우저의 DNS를 지정할 수 없음.

---

## 2. 가능 여부 요약

| 항목 | 가능 여부 | 비고 |
|------|-----------|------|
| 브라우저가 앱 설정 DNS를 직접 사용 | **불가** | 브라우저는 자체 네트워크 스택 사용. 앱이 외부 브라우저의 DNS를 지정할 수 없음. |
| 브라우저가 **프록시를 사용**하면 DNS 적용 | **가능** | 브라우저 → Watchtower 프록시 → 프록시가 설정된 DNS로 호스트 해석 → 대상 서버. |
| domains 링크 클릭 시 프록시 경유 열기 | **가능** | `http://127.0.0.1:{reverse_http_port}/` 또는 포워드 프록시 기준으로 URL 변환 가능. 다만, 프록시가 기동 중이어야 함. |
| in-app 브라우저(WebView)로 DNS 제어 | **가능** | WebView에 프록시를 지정하면 DNS 제어 가능. 별도 구현 비용 큼. |

**결론**: 브라우저가 **Watchtower 프록시**를 사용하도록 설정되어 있으면, domains에서 열 때도 프록시를 거치고, 프록시가 설정된 DNS를 사용함. 따라서 **이미 가능한 구성**이다. 별도 “도메인 열 때 DNS 지정” 기능은 없어도 됨.

---

## 3. 동작 흐름 (프록시 사용 시)

```
[사용자] domains에서 도메인 링크 클릭
   ↓
[브라우저] URL 열기 (시스템 기본 브라우저)
   ↓
브라우저가 프록시(PAC 또는 수동) 사용 중이면
   ↓
[Watchtower 프록시] 127.0.0.1:port 로 요청 수신
   ↓
[프록시] 설정된 DNS(dns_server)로 호스트 해석
   ↓
[프록시] 실제 서버로 연결·전달
```

- **설정**: Settings → DNS server, Proxy → PAC 또는 수동 프록시 설정.
- **브라우저**: PAC URL 또는 `127.0.0.1:{proxy_port}` 수동 프록시로 설정.
- **domains**: 링크 `<a href={url}>` → 그대로 클릭 시 브라우저가 열고, 브라우저가 프록시를 쓰면 자동으로 프록시·DNS 경유.

---

## 4. 구현 가능한 옵션 (선택 사항)

### 4.1 링크를 프록시 경유 URL로 열기

프록시가 기동 중일 때, domains 링크를 **리버스 HTTP 포트**로 열도록 변경:

- 예: `https://example.com` → `http://127.0.0.1:8080/https://example.com` (또는 프록시가 지원하는 경로 형식)
- 또는 **포워드 프록시** 사용 시: 브라우저가 이미 프록시를 쓰면 일반 URL 그대로 두어도 됨.

구현 시: 프록시 기동 시점에만 적용, 리버스 포트가 없으면 기존 동작 유지.

### 4.2 프록시/DNS 미설정 시 안내

- UI에 툴팁/문구:
  - “브라우저에서 PAC/프록시를 설정하면, 설정된 DNS가 적용됩니다.”
  - “설정 → DNS server에서 DNS를 지정한 뒤, Proxy → PAC URL을 브라우저에 설정하세요.”

### 4.3 in-app 브라우저 (WebView)

- WebView 내장 시, 앱에서 프록시 지정 가능 → DNS 제어 가능.
- 구현 비용: WebView UI, 프록시 연동, 탐색 UX 등. 별도 기획 필요.

---

## 5. 체크리스트 (구현 시)

| 구분 | 항목 |
|------|------|
| 문서 | 현재 문서를 06·07과 정합성 유지 (설정 페이지가 05의 “SSL 다운로드·설정 안내” 역할 일부 수행). |
| FE | (선택) domains 링크 클릭 시 프록시 경유 URL로 열기 옵션. |
| FE | (선택) domains/Status Logs 페이지에 “프록시·DNS 설정 시 적용됨” 안내 문구. |
| BE | 필요 시 `get_proxy_status` 등으로 리버스/포워드 포트 확인 후, FE에서 URL 생성용 정보 제공. |

---

## 6. 요약

- **가능하다.**  
  - 브라우저가 Watchtower 프록시(PAC 또는 수동)를 사용하면, domains에서 열 때도 프록시를 거치고, 프록시가 설정된 DNS를 사용함.  
- **별도 기능 없이** 이미 가능한 구성.  
- 선택적으로:  
  - 링크를 프록시 경유 URL로 열기  
  - 프록시/DNS 미설정 시 안내 문구  
  - (장기) in-app WebView  

설정 페이지(07)의 “프록시 연결하기” 및 PAC URL 설정이 완료되면, domains에서 열 때도 자동으로 DNS가 적용됨.
