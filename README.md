# Homelab Project

A recovery-first homelab built around OpenWrt networking, TrueNAS storage, Proxmox virtualization, a ServiceNow MID Server discovery test, and an Internet-isolated Meshtastic segment.

> **Core principle:** Build and validate recovery capability before adding additional services.

---

## Goals

- Segment normal homelab services from Meshtastic devices.
- Keep the Meshtastic network isolated from the Internet.
- Establish reliable storage, snapshots, backups, and restore procedures.
- Host a small number of controlled test workloads.
- Validate ServiceNow Discovery using a single safe test container.
- Add optional services only after the foundation is stable and recoverable.

---

## Initial Components

- **GL.iNet Opal / OpenWrt:** Gateway, firewall, and network segmentation
- **TrueNAS:** Storage, SMB/NFS shares, snapshots, and backup target
- **Proxmox VE:** Virtual machine and container host
- **Rocky Linux 8:** ServiceNow MID Server host
- **ServiceNow PDI:** Discovery and CMDB learning environment
- **Meshtastic:** Internet-isolated LoRa mesh segment
- **Optional services:** Pi-hole, NGINX, Nextcloud, MQTT, Apache

---

## Architecture

```text
                               Internet
                                  |
                       Existing Home Router
                                  |
                         GL.iNet Opal / OpenWrt
                    Default Gateway and Firewall Policy
                                  |
          +-----------------------+------------------------+
          |                                                |
          v                                                v
 Normal Homelab Network                         Meshtastic Network
     1.0/24                                             2.0/24
 Internet allowed as needed                       Internet denied
          |                                                |
          |-- TrueNAS                                      |-- Meshtastic Node
          |  .1.15                                         |   .2.60:3000
          |   SMB, NFS, snapshots, backups,                |
          |   optional Nextcloud                           |-- Project Nomad
          |                                                |    .2.60:9446
          |                                                |
          |-- Proxmox VE                                   `-- Apache Service
          |     1.10                                           2.60:8080
          |   |
          |   |-- Debian Discovery Test Container
          |   |-- Pi-hole Container (optional)
          |   |-- NGINX Container (optional)
          |  
          |-- Rocky Linux 8 MID Server
          |    1.20
          |   |
          |   `-- Outbound HTTPS to ServiceNow PDI
          |
          `-- Windows 11 Physical Host
              Docker workloads
