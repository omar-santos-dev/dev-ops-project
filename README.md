#Homelab Project
GL.iNet/OpenWrt network

TrueNAS storage and backup foundation

Proxmox and a single test container

Rocky Linux MID Server and one Discovery test

Meshtastic Internet-isolated segment

Optional services: Pi-hole, NGINX, Nextcloud, MQTT, Apache

The key principle is: build the ability to recover before building more services.

Revised Whole-Lab Architecture
                               Internet
                                  |
                       Existing Home Router
                                  |
                         GL.iNet Opal / OpenWrt
                    Default gateway and firewall policy
                                  |
          +-----------------------+------------------------+
          |                                                |
          v                                                v
Normal Homelab Network                         Meshtastic Network
10.10.30.0/24                                  10.10.40.0/24
Internet allowed as needed                     Internet denied
          |                                                |
          |-- TrueNAS                                      |-- Meshtastic node
          |   Storage, SMB, NFS, snapshots,                |   10.10.40.60
          |   backups, optional Nextcloud                  |
          |   10.10.30.15                                  `-- Optional local-only
          |                                                    Meshtastic services later
          |
          |-- Proxmox VE
          |   10.10.30.10
          |   |
          |   |-- Debian Discovery Test CT
          |   |-- Pi-hole CT later, if needed
          |   |-- NGINX CT later, if needed
          |   `-- Other approved lab VMs/CTs
          |
          |-- Rocky Linux 8 MID Server
          |   10.10.30.20
          |   |
          |   `-- Outbound HTTPS to ServiceNow PDI
          |
          `-- Windows 11 physical host
              Docker workloads
System Roles
System	Primary role	Initial priority
GL.iNet OpenWrt	Router, gateway, firewall, segment isolation	1
TrueNAS	Storage, SMB/NFS shares, snapshots, backup target	2
Proxmox	VM and LXC host	3
Rocky Linux OptiPlex	ServiceNow MID Server	4
ServiceNow PDI	Discovery control plane and CMDB learning environment	4
Meshtastic node	Local LoRa mesh communications	5
Pi-hole	Optional local DNS	6
NGINX	Optional internal web hosting/reverse proxy	6
Nextcloud	Optional local private-cloud file sync	6
MQTT broker	Optional Meshtastic/integration message broker	7
Apache	Only if a specific application requires it	Last / optional
Phase 0 — Make Three Design Decisions
Before installing anything, write down these decisions.

1. TrueNAS role
For the first build, TrueNAS should provide:

SMB file shares for normal file storage;

an NFS share or other supported backup target for Proxmox backups;

storage for Windows backups;

ZFS snapshots;

a second-copy workflow, such as an external drive or another storage system.

Do not initially use TrueNAS as:

primary live VM storage for Proxmox;

PXE/DHCP server;

Docker host;

MQTT broker;

Nextcloud server;

media server;

application server.

Those may be reasonable later, but not until the storage and restore process works.

2. Meshtastic isolation definition
Your current requirement is best described as:

Meshtastic is Internet-isolated. The rest of the homelab may access the Internet as required.

That is normally logical network isolation, not a strict physical air gap.

Meshtastic network → Internet: blocked
Meshtastic network → normal homelab: blocked by default
Admin workstation → Meshtastic node: allowed only as needed
3. MQTT decision
Do not deploy MQTT yet.

If you want the Meshtastic segment to remain Internet-isolated, do not configure Internet-based Meshtastic MQTT bridging. A local-only broker is possible later, but it must have a defined purpose and should remain inside the permitted boundary. Meshtastic’s MQTT module is intended to bridge eligible mesh traffic through an MQTT broker when a gateway node has network connectivity and channel uplink/downlink settings permit it. meshtastic.org+1

Phase 1 — Build the GL.iNet/OpenWrt Network First
Objective: All systems use the GL.iNet as their default gateway, so its firewall rules actually enforce your design.

Network plan
Network	Subnet	Gateway	Internet policy
Normal Homelab	10.10.30.0/24	10.10.30.1	Allowed as needed
Meshtastic	10.10.40.0/24	10.10.40.1	Denied
Initial static/reserved addresses
Device	Address
GL.iNet normal-LAN gateway	10.10.30.1
GL.iNet Meshtastic gateway	10.10.40.1
Proxmox	10.10.30.10
TrueNAS	10.10.30.15
Rocky MID Server	10.10.30.20
Pi-hole, later	10.10.30.21
NGINX, later	10.10.30.22
Debian Discovery test CT	10.10.30.50
Meshtastic node	10.10.40.60
Initial firewall policy
Normal Homelab → WAN              Allow
Meshtastic → WAN                  Deny

Meshtastic → Normal Homelab       Deny
Normal Homelab → Meshtastic       Deny by default

Approved admin workstation
  → Meshtastic node               Allow only required local management/API ports
Save a GL.iNet configuration backup before changing interfaces, DHCP scopes, Wi-Fi networks, or firewall zones. The Opal provides GL.iNet management functions with access to advanced OpenWrt configuration. gl-inet.com

Validation:

A normal homelab device can browse the Internet.

A Meshtastic-segment device receives an IP address.

A Meshtastic-segment device cannot browse the Internet.

The two networks cannot freely communicate.

Phase 2 — Build TrueNAS Before Proxmox Workloads
Objective: Establish reliable storage and recovery capability.

2.1 Install TrueNAS
Use a stable address:

Hostname: truenas-lab-01
IP:       10.10.30.15
Gateway:  10.10.30.1
Before storing data:

confirm all disks are visible and healthy;

create the ZFS pool;

configure SMART, scrub, and capacity alerts;

record pool name, disk serial numbers, and network configuration;

export or securely record recovery information appropriate to your configuration.

2.2 Create datasets
Use separate datasets. Replace tank with your actual pool name.

tank/
├── shared/
├── backups/
│   ├── proxmox/
│   ├── windows/
│   └── configuration-exports/
├── iso/
├── nextcloud/                 # Create only if/when deploying Nextcloud
│   ├── data/
│   ├── db/
│   ├── dbbackup/
│   └── config/
└── app-data/                  # Future application data, if required
Separate datasets allow separate permissions, quotas, snapshots, and retention policies. TrueNAS periodic snapshot tasks create read-only versions of pools or datasets on a schedule. truenas.com

2.3 Create only two shares initially
Dataset	Protocol	Purpose
tank/shared	SMB	Normal file storage
tank/backups/proxmox	NFS	Proxmox backup target
You can add the Windows backup share after validating basic NAS access.

2.4 Configure initial snapshot policy
Example starter schedule:

Dataset	Frequency	Retention
shared	Every 6 hours	30 days
backups/proxmox	Daily	30–60 days
backups/windows	Daily	30–60 days
nextcloud	Daily	30 days
Snapshots are useful recovery points, but they are not an independent backup if they remain only on the same TrueNAS pool. Create a second copy later using an external drive, a second NAS, or replication to another system. TrueNAS replication transfers snapshot-based data to a local or remote destination. truenas.com+1

2.5 Perform a restore test
Before moving on:

Copy a test file to the SMB share.

Take or wait for a snapshot.

Delete the file.

Restore it from the snapshot.

Document the recovery steps.

Do not call the NAS complete until you have restored data successfully.

Phase 3 — Install Proxmox and Connect It to TrueNAS Backups
Objective: Host workloads locally while sending backups to TrueNAS.

Initial Proxmox configuration
Hostname: pve-lab-01
IP:       10.10.30.10/24
Gateway:  10.10.30.1
Initial storage design
For the first build:

Proxmox local disks
   └── Live VM and CT disks

TrueNAS NFS dataset
   └── Proxmox backup files
Do not use TrueNAS for live Proxmox VM disks yet. Keep live workloads on Proxmox local storage until you understand networking, storage performance, backups, and restores.

Proxmox VE supports local and shared storage, including NFS and iSCSI, and supports scheduled backups to configured backup storage. proxmox.com+1

Configure the TrueNAS backup target
On TrueNAS:

export tank/backups/proxmox via NFS;

restrict access to the Proxmox IP: 10.10.30.10.

On Proxmox:

add the NFS export as backup storage;

enable content type appropriate for backups;

create a scheduled backup job.

Create one test CT
Setting	Value
Name	ct-discovery-test-01
IP	10.10.30.50
OS	Debian
CPU	1 vCPU
Memory	512 MB
Disk	8 GB
Container type	Unprivileged
Purpose	Safe ServiceNow Discovery target
Then:

Back up the CT to TrueNAS.

Delete the CT.

Restore it.

Verify it boots and is reachable.

This is your first full workload recovery test.

A Proxmox Backup Server is a stronger long-term backup option because it is optimized for Proxmox VM, container, and physical-host backups. However, do not add it during the initial build; an NFS backup target on TrueNAS is simpler for your first operational backup workflow. proxmox.com+1

Phase 4 — Build the Rocky Linux MID Server
Objective: Prove PDI communication and Discovery against the single Debian CT.

Rocky host configuration
Hostname: mid-lab-01
IP:       10.10.30.20
Gateway:  10.10.30.1
Required paths:

MID Server → ServiceNow PDI        TCP 443 outbound
MID Server → Debian test CT        TCP 22
Build sequence:

Install Rocky Linux 8 on the Dell OptiPlex.

Set static addressing or a DHCP reservation.

Configure DNS and NTP.

Confirm HTTPS access to the PDI.

Install the MID Server using the PDI-provided Linux package.

Confirm status is Up.

Review ECC Queue entries.

Configure a non-root SSH Discovery account on 10.10.30.50.

Run Discovery against only 10.10.30.50.

Review the resulting CI in the CMDB.

Do not start Discovery against TrueNAS, Proxmox, Docker, the router, or your whole home network. First prove the PDI → MID → Debian CT → CMDB workflow.

Phase 5 — Build the Meshtastic Segment
Objective: Keep Meshtastic Internet-isolated while preserving local administrative access.

Meshtastic node: 10.10.40.60
Gateway:         10.10.40.1
Internet:        blocked
Build sequence:

Connect the Meshtastic node to the Meshtastic SSID/VLAN.

Reserve 10.10.40.60.

Verify local node access by IP.

Verify the node cannot reach the Internet.

Add one narrow firewall rule:

authorized workstation → Meshtastic node;

only required management/API ports.

Test LoRa messaging separately from network administration.

Do not place TrueNAS, Proxmox, or the MID Server inside the Meshtastic segment.

Also, do not have the MID Server discover the Meshtastic segment initially. If you later decide that the Meshtastic node must be inventoried, use a deliberate, narrow firewall rule and document the reason.

Phase 6 — Add Optional Services
Only after the preceding phases work.

Pi-hole
Deploy Pi-hole if you want local DNS names:

pve-lab-01.lab.home        → 10.10.30.10
truenas-lab-01.lab.home    → 10.10.30.15
mid-lab-01.lab.home        → 10.10.30.20
meshtastic-node.lab.home   → 10.10.40.60
NGINX
Deploy NGINX if you need:

internal websites;

an internal landing page;

reverse proxying;

a locally hosted Meshtastic Web Client;

future dashboards.

Nextcloud
Deploy Nextcloud only after SMB shares, snapshots, TrueNAS backups, and restores work.

If your TrueNAS system runs SCALE, Nextcloud should use dedicated persistent datasets for application data, user data, database data, database backups, and configuration-related storage. TrueNAS guidance for Nextcloud deployments identifies a primary app dataset plus separate child datasets for data, database, database backup, and additional application storage. truenas.com+2

Start Nextcloud as:

Access: LAN only
Users: You only
Purpose: File synchronization and phone photo upload
Protection: ZFS snapshots plus separate backup copy
Remote access: None initially
MQTT broker
Add a Mosquitto broker only after defining one of these use cases:

local-only telemetry;

a home automation integration;

Meshtastic gateway bridging;

monitoring/dashboard data.

Do not install it just because it is available.

Final Build Priority List
Priority	Build item	Completion condition
1	GL.iNet/OpenWrt	Normal and Meshtastic networks exist; Meshtastic Internet is blocked
2	TrueNAS	Pool, datasets, SMB share, snapshots, and file restore test work
3	Proxmox	Host is stable; test CT backup and restore from TrueNAS succeed
4	Rocky MID Server	MID shows Up in the PDI
5	ServiceNow Discovery test	One Debian CT becomes or updates a CMDB CI
6	Meshtastic	Node works locally but cannot access Internet
7	Pi-hole	Local DNS names work, if desired
8	NGINX	Required internal web content is served, if needed
9	Nextcloud	LAN-only sync and restore test work, if needed
10	MQTT / Apache / PXE	Build only for a defined requirement
The immediate next action should be Phase 1 networking, followed by TrueNAS pool, datasets, snapshot policy, and a restore test.




# This is Document.

