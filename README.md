# 🛡️ Enterprise-Grade CI/CD Platform

<div align="center">

  <!-- Live Status Badges with Official Logos -->
  <a href="https://github.com/Ma1910/test-cicd/actions">
    <img src="https://github.com/Ma1910/test-cicd/actions/workflows/ci.yml/badge.svg" alt="CI/CD Pipeline Status" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd">
    <img src="https://img.shields.io/badge/Code_Coverage-100%25-brightgreen?style=flat-square&logo=vitest&logoColor=white" alt="Code Coverage" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd">
    <img src="https://img.shields.io/badge/Security-Trivy_Hardened-blue?style=flat-square&logo=aquasec&logoColor=white" alt="Trivy Hardened" />
  </a>
  <a href="https://github.com/Ma1910/test-cicd">
    <img src="https://img.shields.io/badge/CIS_Docker-Non--Root_Passed-success?style=flat-square&logo=docker&logoColor=white" alt="CIS Docker" />
  </a>

  <br/><br/>

  <!-- Official Technology Vector Badges -->
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Node.js_20_%26_22-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Docker_Multi--Stage-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/GitHub_Actions_DAG-2088FF?style=for-the-badge&logo=githubactions&logoColor=white" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Vitest_v3-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/GHCR_Container-Ready-orange?style=for-the-badge&logo=github&logoColor=white" alt="GHCR" />

  <p align="center">
    <em>Quy trình tích hợp và triển khai liên tục (CI/CD) đồ họa phân luồng chuẩn Senior DevOps.</em>
  </p>

</div>

---

## 🏛️ Sơ đồ Luồng Đồ Thị Pipeline (DAG Flowchart)

```mermaid
graph TD
    Dev([💻 Git Push / PR]) --> SecScan["🛡️ Shift-Left Security<br/>Trivy Secret Scanner"]
    Dev --> Quality["🔍 Static Quality Gate<br/>TypeScript Strict Compiler"]

    SecScan --> Matrix20["🧪 Node 20 LTS Matrix<br/>Vitest 80% Coverage Gate"]
    Quality --> Matrix20

    SecScan --> Matrix22["⚡ Node 22 LTS Matrix<br/>Vitest 80% Coverage Gate"]
    Quality --> Matrix22

    SecScan --> SAST["🔬 SAST & Security Audit<br/>Trivy Vulnerabilities + npm audit"]
    Quality --> SAST

    Matrix20 --> Docker["🐳 Docker Image Hardening<br/>Multi-stage + Non-root + Trivy CVE"]
    Matrix22 --> Docker
    SAST --> Docker

    Docker --> Staging["🧪 Staging Progressive Deploy<br/>Automated Smoke Test 200 OK"]

    Staging --> ProdGate{{"🚀 Production Gate & Rollout<br/>Protected Review & Auto-Rollback"}}

    ProdGate --> Summary["📊 Executive Quality Report<br/>GitHub Step Summary Dashboard"]

    classDef success fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff;
    class SecScan,Quality,Matrix20,Matrix22,SAST,Docker,Staging,ProdGate,Summary success;
```

---

## 🔒 Các tiêu chuẩn kiểm duyệt nghiêm ngặt

- **Shift-Left Security**: Tự động phát hiện và chặn đứng mọi token, private key rò rỉ.
- **Parallel Matrix Testing**: Chạy song song trên cả 2 phiên bản Node 20 LTS và Node 22 LTS.
- **Coverage Gate**: Ngưỡng bắt buộc $\ge 80\%$ test coverage (hiện tại đạt 100%).
- **Container Hardening**: Multi-stage, user `node` non-root, quét sạch CVE trước khi push.
- **Staging Progressive Delivery**: Tự động kiểm tra liveness và độ trễ phản hồi qua Smoke Test.
- **Production Gate & Auto-Rollback**: Bảo vệ an toàn tuyệt đối cho môi trường khách hàng sử dụng.

---

## 🛠️ Kiểm thử cục bộ

```bash
# 1. Chạy test và đo độ phủ Coverage nghiêm ngặt (Yêu cầu >= 80%)
npm run test:coverage

# 2. Kiểm tra kiểu dữ liệu nghiêm ngặt
npm run typecheck

# 3. Build mã nguồn production
npm run build
```
