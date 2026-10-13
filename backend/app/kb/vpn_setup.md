# VPN Setup & Troubleshooting Guide

## Overview
QuickDesk remote employees must use the internal WireGuard or OpenVPN client to access private intranet tools, staging environments, and database clusters.

## Installation Steps
1. Download the official company WireGuard profile from the internal portal (`https://portal.company.internal/vpn-config`).
2. Import the `.conf` file into your WireGuard desktop client.
3. Activate the tunnel. Your internal IP address should begin with `10.42.x.x`.

## Troubleshooting Connection Drops
- **Timeout after 5 minutes**: Check if your home Wi-Fi or router firewall blocks UDP traffic on port 51820. Switch the client settings to UDP port 443 or fallback to OpenVPN TCP mode.
- **TLS Handshake Failures**: This typically indicates an expired client certificate. Client certificates expire every 90 days. Regenerate your certificate through Okta SSO.
- **Split Tunneling**: Company VPN routes only internal IP ranges (`10.0.0.0/8` and `172.16.0.0/12`). Public internet traffic bypasses the VPN tunnel to preserve bandwidth.

## Support
If connectivity fails after restarting the WireGuard daemon, contact the IT Infrastructure team on Slack `#help-infrastructure`.
