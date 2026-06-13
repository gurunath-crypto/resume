"""
Skills taxonomy for DevOps / SRE / AIOps resumes.

This drives two things:
  1. The skill chips shown in the UI (student selects / deselects).
  2. The keyword universe the AI draws from when it tailors a resume.

Keep this list market-current. The AIOps block is intentionally rich because
that is the fastest-growing keyword set recruiters now screen for.
"""

# Ordered so the most ATS-valuable categories surface first in the UI.
SKILLS_CATALOG: dict[str, list[str]] = {
    "Cloud Platforms": [
        "AWS", "Azure", "GCP", "OCI", "EKS", "AKS", "GKE", "EC2", "Lambda",
        "S3", "RDS", "Aurora", "DynamoDB", "VPC", "Route53", "CloudFront",
        "IAM", "CloudFormation", "CloudWatch", "API Gateway",
    ],
    "Containers & Orchestration": [
        "Kubernetes", "Docker", "Helm", "Kustomize", "OpenShift", "Rancher",
        "Containerd", "Podman", "Karpenter", "Cluster Autoscaler",
        "HPA/VPA", "Operators", "ECS", "Fargate",
    ],
    "CI/CD & GitOps": [
        "Jenkins", "GitHub Actions", "GitLab CI", "ArgoCD", "Flux CD",
        "Tekton", "Spinnaker", "Harness", "Azure DevOps", "CircleCI",
        "Argo Rollouts", "Blue-Green", "Canary", "Sync Waves",
    ],
    "Infrastructure as Code": [
        "Terraform", "Terragrunt", "Ansible", "Pulumi", "CloudFormation",
        "AWS CDK", "Packer", "Crossplane", "Atlantis", "tfsec", "Checkov",
    ],
    "Observability & Monitoring": [
        "Prometheus", "Grafana", "Loki", "Tempo", "Thanos", "Datadog",
        "New Relic", "Dynatrace", "Splunk", "ELK Stack", "Fluent Bit",
        "OpenTelemetry", "Jaeger", "Zabbix", "PromQL",
    ],
    "AIOps & Intelligent Ops": [
        "Moogsoft", "BigPanda", "Dynatrace Davis AI", "PagerDuty AIOps",
        "Datadog Watchdog", "Anomaly Detection", "Predictive Autoscaling",
        "Event Correlation", "Noise Reduction", "Alert Deduplication",
        "ML-based Capacity Planning", "Auto-Remediation", "Root-Cause Analysis",
        "Elastic ML", "Splunk ITSI", "AWS DevOps Guru",
    ],
    "Security & Compliance": [
        "HashiCorp Vault", "Trivy", "Snyk", "SonarQube", "Falco", "OPA",
        "Kyverno", "Cosign", "Aqua Security", "GuardDuty", "Security Hub",
        "PCI-DSS", "SOC 2", "ISO 27001", "CIS Benchmarks", "DevSecOps",
    ],
    "Service Mesh & Networking": [
        "Istio", "Linkerd", "Consul", "Envoy", "NGINX", "Traefik",
        "HAProxy", "Kong", "Cilium", "Calico", "mTLS",
    ],
    "Databases & Storage": [
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "Elasticsearch",
        "Kafka", "RabbitMQ", "InfluxDB", "Ceph", "MinIO",
    ],
    "Scripting & Languages": [
        "Python", "Bash", "Go", "PowerShell", "Groovy", "YAML", "HCL",
        "JavaScript", "SQL", "Jinja2",
    ],
    "SRE Practices": [
        "SLO/SLI", "Error Budgets", "Chaos Engineering", "Litmus", "Gremlin",
        "Incident Management", "PagerDuty", "Opsgenie", "Runbooks",
        "Post-Mortems", "Load Testing", "k6", "JMeter", "DR/HA",
    ],
}

# Role presets steer the AI's emphasis. The student picks one target role.
ROLE_PRESETS: dict[str, dict] = {
    "DevOps Engineer": {
        "title": "DevOps Engineer | CI/CD & Cloud Automation",
        "emphasis": ["CI/CD & GitOps", "Infrastructure as Code", "Containers & Orchestration", "Cloud Platforms"],
    },
    "Site Reliability Engineer": {
        "title": "Site Reliability Engineer | Observability & Resilience",
        "emphasis": ["SRE Practices", "Observability & Monitoring", "AIOps & Intelligent Ops", "Containers & Orchestration"],
    },
    "Cloud Engineer": {
        "title": "Cloud Engineer | Multi-Cloud Infrastructure",
        "emphasis": ["Cloud Platforms", "Infrastructure as Code", "Security & Compliance", "Containers & Orchestration"],
    },
    "Platform Engineer": {
        "title": "Platform Engineer | Internal Developer Platforms",
        "emphasis": ["Containers & Orchestration", "CI/CD & GitOps", "Infrastructure as Code", "Observability & Monitoring"],
    },
    "AIOps / Observability Engineer": {
        "title": "AIOps & Observability Engineer | Intelligent Operations",
        "emphasis": ["AIOps & Intelligent Ops", "Observability & Monitoring", "SRE Practices", "Cloud Platforms"],
    },
    "DevSecOps Engineer": {
        "title": "DevSecOps Engineer | Secure Cloud Delivery",
        "emphasis": ["Security & Compliance", "CI/CD & GitOps", "Containers & Orchestration", "Infrastructure as Code"],
    },
}

EXPERIENCE_LEVELS = ["Fresher / 0-1 yrs", "Junior / 1-2 yrs", "Mid / 2-4 yrs", "Senior / 4-6 yrs", "Lead / 6+ yrs"]


def all_skills() -> list[str]:
    seen: list[str] = []
    for items in SKILLS_CATALOG.values():
        for s in items:
            if s not in seen:
                seen.append(s)
    return seen
