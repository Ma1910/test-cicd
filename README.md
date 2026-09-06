# 🚀 Enterprise-Grade CI/CD Automation Platform

<div align="center">

  <!-- Live Status Badges (Clickable to real GitHub Actions & Packages) -->
  <a href="https://github.com/Ma1910/test-cicd/actions/workflows/ci.yml">
    <img src="https://github.com/Ma1910/test-cicd/actions/workflows/ci.yml/badge.svg" alt="CI/CD Pipeline Status" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/tests/app.test.ts">
    <img src="https://img.shields.io/badge/Test_Coverage-100%25-brightgreen?style=for-the-badge&logo=vitest&logoColor=white" alt="Code Coverage 100%" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml">
    <img src="https://img.shields.io/badge/Trivy_Security-Zero_Vulnerabilities-blue?style=for-the-badge&logo=aquasec&logoColor=white" alt="Trivy Security Scanner" />
  </a>
  <a href="https://github.com/Ma1910?tab=packages&repo_name=test-cicd">
    <img src="https://img.shields.io/badge/Docker_Container-Non--Root_Hardened-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Container Package" />
  </a>

  <br/><br/>

  <!-- Official Clickable Technology Badges -->
  <a href="https://github.com/Ma1910/test-cicd/blob/main/tsconfig.json">
    <img src="https://img.shields.io/badge/TypeScript-Strict_Mode-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript Strict Mode" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/package.json">
    <img src="https://img.shields.io/badge/Node.js-20_LTS_%26_22_LTS-339933?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js Matrix" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/vitest.config.ts">
    <img src="https://img.shields.io/badge/Vitest-v3_Test_Suite-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="Vitest Suite" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/Dockerfile">
    <img src="https://img.shields.io/badge/Docker-Multi--Stage_Alpine-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Dockerfile" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml">
    <img src="https://img.shields.io/badge/GitHub_Actions-Visual_DAG_Pipeline-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions Workflow" />
  </a>

  <p align="center">
    <em>A production-grade CI/CD showcase designed with Senior DevOps best practices: Shift-Left Security, Parallel Matrix Testing, 80% Coverage Gate, and Container Hardening.</em>
  </p>

</div>

---

## 💡 What is CI/CD? (Simplified)

Think of software development like an automated modern car factory:

| Traditional Manual Process | Automated CI/CD (This Platform) |
| :--- | :--- |
| ❌ Manually running test commands on your local laptop. | ✅ **100% Automated**: Pushing code immediately triggers full end-to-end verification. |
| ❌ Risk of committing leaked secrets, API keys, or tokens. | ✅ **Shift-Left Security Gate**: Trivy scans every commit to detect and block secret leaks immediately. |
| ❌ "Works on my machine" bugs when deploying to servers. | ✅ **Multi-Environment Matrix**: Runs tests simultaneously on both **Node.js 20 LTS** and **Node.js 22 LTS**. |
| ❌ High risk of deploying broken code to production. | ✅ **Strict Quality Gates**: Rejects builds if code coverage falls below 80% or any CVE is detected. |

> **Bottom Line**: Developers simply write code and push (`git push origin main`). Quality, security, and packaging happen completely automatically.

---

## 🗺️ Visual Pipeline Flowchart (DAG Architecture)

Every push flows through these distinct stages, rendered live in GitHub Actions:

```mermaid
flowchart LR
    %% Modern styling classes
    classDef startNode fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff;
    classDef checkNode fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#fff;
    classDef testNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    classDef packNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff;
    classDef deployNode fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff;

    subgraph Phase1 ["1. Intake & Shift-Left Security"]
        Push(["💻 Developer Git Push"]):::startNode
        Sec["🛡️ Secret Leak Scanner<br/>(Trivy Secret Engine)"]:::checkNode
        Type["🔍 TypeScript Strict Check<br/>(tsc --noEmit)"]:::checkNode
    end

    subgraph Phase2 ["2. Parallel Matrix Testing"]
        Node20["🧪 Node.js 20 LTS Test<br/>(Vitest Engine)"]:::testNode
        Node22["⚡ Node.js 22 LTS Test<br/>(Vitest Engine)"]:::testNode
    end

    subgraph Phase3 ["3. Quality & Security Gates"]
        Gate["📊 Coverage Gate<br/>(Enforce Coverage ≥ 80%)"]:::testNode
        SAST["🔬 SAST & Dependency Audit<br/>(Trivy Vulnerabilities)"]:::checkNode
    end

    subgraph Phase4 ["4. Container Hardening"]
        Docker["🐳 Docker Multi-stage Build<br/>(Non-Root CIS Benchmark)"]:::packNode
    end

    subgraph Phase5 ["5. Delivery & Release"]
        Staging["🧪 Staging Progressive Deploy<br/>(Automated 200 OK Smoke Test)"]:::deployNode
        Prod["🚀 Production Gate & Rollout<br/>(Automated Rollback Guard)"]:::deployNode
        Report["📋 Executive Quality Report<br/>(Job Summary Dashboard)"]:::deployNode
    end

    Push --> Sec
    Push --> Type

    Sec --> Node20
    Type --> Node22
    Sec --> SAST
    Type --> SAST

    Node20 --> Gate
    Node22 --> Gate

    Gate --> Docker
    SAST --> Docker

    Docker --> Staging
    Staging --> Prod
    Prod --> Report
```

---

## 🛡️ 7 Production-Grade Defense Gates

1. **[Secret Leak Scanner](https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml#L18-L32)**:
   - Scans the entire Git history on every commit for credentials, tokens, and private keys. Fails immediately upon detection to protect accounts.
2. **[TypeScript Strict Check](https://github.com/Ma1910/test-cicd/blob/main/tsconfig.json)**:
   - Enforces strict static type verification. Zero tolerance for type mismatches.
3. **[Parallel Matrix Testing](https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml#L55-L100)**:
   - Validates test suites simultaneously across **Node.js 20 LTS** and **Node.js 22 LTS** runners in parallel.
4. **[Coverage Threshold Gate](https://github.com/Ma1910/test-cicd/blob/main/vitest.config.ts)**:
   - Enforces an automated quality gate in Vitest: any commit with less than **80% code coverage** fails the pipeline. Currently achieving **100% Code Coverage**.
5. **[Docker Image Hardening](https://github.com/Ma1910/test-cicd/blob/main/Dockerfile)**:
   - Minimal Alpine base image running under unprivileged user `node:node` (CIS Benchmark compliance). Scans images for CRITICAL/HIGH CVEs before publishing.
6. **[Staging Smoke Test](https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml#L182-L204)**:
   - Probes the deployed service `/healthz` endpoint to confirm `200 OK` HTTP status and latency under 20ms before promoting to production.
7. **[Production Rollback Guard](https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml#L206-L233)**:
   - Automated post-deployment verifier. If health validation fails, an automated rollback hook reverts to the previous stable release.

---

## 💻 Local Quickstart (3 Steps)

This repository contains real, production-ready code. You can verify it locally:

### 1. Start Development Server
```bash
npm run dev
```
- Open `http://localhost:3000/` for service greeting.
- Open `http://localhost:3000/healthz` for real-time uptime status.

### 2. Run Test Suite with Coverage
```bash
npm run test:coverage
```
*Vitest executes all unit and integration tests and outputs a 100% statement coverage table in your terminal.*

### 3. Verify TypeScript Build
```bash
npm run typecheck
npm run build
```

---

## 🧪 Real-World Failure Simulation

To verify how the CI/CD pipeline catches and blocks broken code:
1. Open [`tests/app.test.ts`](https://github.com/Ma1910/test-cicd/blob/main/tests/app.test.ts).
2. Change `const simulateFail = false;` to `const simulateFail = true;`.
3. Commit and push:
   ```bash
   git commit -am "test: simulate test failure"
   git push origin main
   ```
4. Check the **[Actions Tab](https://github.com/Ma1910/test-cicd/actions)**: GitHub Actions will flag **FAILED ❌** at the test stage and prevent deployment.

---

## 🔗 Live Artifacts & Quick Links

- **Live GitHub Actions Run**: [View Runs & DAG Flowchart](https://github.com/Ma1910/test-cicd/actions)
- **Published Container Package**: [View Docker Images on GHCR](https://github.com/Ma1910?tab=packages&repo_name=test-cicd)
- **Application Logic**: [`src/app.ts`](https://github.com/Ma1910/test-cicd/blob/main/src/app.ts)
- **Automated Test Suite**: [`tests/app.test.ts`](https://github.com/Ma1910/test-cicd/blob/main/tests/app.test.ts)
- **Multi-stage Dockerfile**: [`Dockerfile`](https://github.com/Ma1910/test-cicd/blob/main/Dockerfile)
- **CI/CD Workflow Definition**: [`.github/workflows/ci.yml`](https://github.com/Ma1910/test-cicd/blob/main/.github/workflows/ci.yml)
