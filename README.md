# LiveKit Meet Docker

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![LiveKit](https://img.shields.io/badge/LiveKit-SFU-00D1B2?style=flat-square&logo=webrtc&logoColor=white)](https://livekit.io/)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg?style=flat-square)](LICENSE)

Self-hosted WebRTC video conferencing stack comprising the [LiveKit SFU Server](https://livekit.io/), the [LiveKit Meet](https://github.com/livekit-examples/meet) Next.js web client, and an automated TLS reverse proxy using Caddy.

Consult the official [LiveKit Documentation](https://docs.livekit.io/) for detailed server architecture and client SDK capabilities.

---

## Highlights

- **WebRTC SFU:** Low-latency selective forwarding unit for multi-party audio/video conferencing.
- **End-to-End Encryption (E2EE):** Built-in client-side encryption.
- **Noise Cancellation:** Client-side RNNoise audio processor with zero cloud dependencies.
- **Automated SSL/TLS:** Automatic certificate management (Let's Encrypt / ZeroSSL) and HTTP/3 via Caddy.
- **Optimized Container:** Multi-stage Next.js build based on Alpine Linux running under a non-root user.
- **Modular Ingress:** Run with the bundled Caddy reverse proxy or integrate into an existing network (Nginx, Traefik, NPM).

---

## Architecture & Traffic Flow

```mermaid
graph TD
    Client[Browser / Client] -->|HTTPS :443 / HTTP/3| Caddy[Caddy Reverse Proxy]
    Client -->|WebRTC UDP :7882| LiveKit[LiveKit SFU Server]
    Client -->|TURN UDP :3478| LiveKit

    subgraph Docker Network: meet-net
        Caddy -->|/ | Meet[Next.js Web App :3000]
        Caddy -->|/rtc* & /twirp* | LiveKit[LiveKit Server :7880]
        Meet -->|Room / Token API :7880 | LiveKit
    end
```

---

## System & Network Requirements

### 1. Kernel UDP Buffer Sizing
WebRTC media traffic uses UDP bursts. To prevent packet loss, increase the maximum socket receive and send buffer sizes.

For baseline deployments (~3 active participants), set at least:

`/etc/sysctl.d/99-livekit.conf`
```ini
net.core.rmem_max=8388608
net.core.wmem_max=8388608
```

Apply changes:
```bash
sudo sysctl --system
```

*(For larger rooms or production deployments under heavy load, LiveKit recommends higher values such as `67108864`).*

### 2. Firewall / Port Allocations

The following ports must be reachable on the host:

| Port | Protocol | Service | Purpose |
| :--- | :--- | :--- | :--- |
| **80** | TCP | Caddy | HTTP (ACME challenge) |
| **443** | TCP / UDP | Caddy | HTTPS / HTTP/3 (Web UI and WebRTC signaling) |
| **7881** | TCP | LiveKit | WebRTC fallback over TCP |
| **7882** | UDP | LiveKit | WebRTC media traffic (RTP/RTCP) |
| **3478** | UDP | LiveKit | Integrated TURN server |

---

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/mikhailde/livekit-meet-docker.git
cd livekit-meet-docker
```

### 2. Configuration Setup

Copy the example configuration files:

```bash
cp .env.example .env
cp build.env.example build.env
cp config/livekit.yaml.example config/livekit.yaml
```

Generate API credentials using the official LiveKit Docker image:

```bash
docker run --rm livekit/livekit-server generate-keys
```

Configure `.env` with your domain and generated credentials:

```env
DOMAIN=meet.yourdomain.com
LIVEKIT_URL=wss://meet.yourdomain.com
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

DOCKER_NETWORK=meet-net
COMPOSE_PROFILES=caddy
EXTERNAL_NETWORK=false
```

Configure frontend build settings in `build.env`:

```env
# Enables the settings menu and built-in RNNoise audio filter
NEXT_PUBLIC_SHOW_SETTINGS_MENU=true
```

Review `config/livekit.yaml`:
```yaml
rtc:
  udp_port: 7882
  tcp_port: 7881
  use_external_ip: true # Detects public IP via STUN

turn:
  enabled: true
  udp_port: 3478

audio:
  active_red_encoding: true
```

> [!NOTE]
> For advanced server options (Redis clustering, TURN authentication, Webhooks, custom codecs), refer to the official [config-sample.yaml reference](https://github.com/livekit/livekit/blob/master/config-sample.yaml).

### 3. (Optional) Custom Minimal UI

To replace the default demo landing page with the bundled minimalist templates:

```bash
cp templates/app/layout.tsx meet/app/layout.tsx
cp templates/app/page.tsx meet/app/page.tsx
```

### 4. Build and Launch

Build and start the services in detached mode:

```bash
docker compose up -d --build
```

Monitor container health and certificate generation:

```bash
docker compose ps
docker compose logs -f caddy
```

---

## External Reverse Proxy

To route traffic through an existing reverse proxy (e.g., Nginx, Traefik, NPM) instead of Caddy:

1. In `.env`, disable the Caddy profile and connect to your Docker network:
   ```env
   COMPOSE_PROFILES=
   EXTERNAL_NETWORK=true
   DOCKER_NETWORK=your_proxy_network
   ```

2. Forward incoming traffic:
   - Route `/rtc*` and `/twirp*` to `http://livekit:7880` (WebSocket / Upgrade headers must be enabled).
   - Route all other requests (`/`) to `http://meet:3000`.

---

## Operations & Maintenance

- **View service logs:**
  ```bash
  docker compose logs -f meet
  docker compose logs -f livekit
  ```

- **Update the Meet application (Git Subtree):**
  The `meet` folder is tracked via Git subtree. To pull changes from upstream:
  ```bash
  git subtree pull --prefix meet https://github.com/livekit-examples/meet.git main --squash
  docker compose up -d --build meet
  ```

- **Restart / Stop:**
  ```bash
  docker compose restart
  docker compose down
  ```

---

## Directory Layout

```text
livekit-meet-docker/
├── config/
│   ├── Caddyfile              # Ingress routing rules
│   ├── livekit.yaml           # SFU / WebRTC configuration
│   └── livekit.yaml.example
├── meet/                      # LiveKit Meet application (managed via Git subtree)
├── templates/                 # Optional minimal UI replacements
├── Dockerfile                 # Multi-stage Next.js image definition
├── docker-compose.yml         # Service orchestration definition
├── build.env.example          # Build-time frontend environment defaults
├── .env.example               # Runtime environment defaults
└── README.md
```

---

## References

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Server Sample Configuration](https://github.com/livekit/livekit/blob/master/config-sample.yaml)
- [LiveKit Meet Source Repository](https://github.com/livekit-examples/meet)

---

## License

This project configuration is licensed under the [Apache 2.0 License](LICENSE). LiveKit is a registered trademark of [LiveKit, Inc.](https://livekit.io/).