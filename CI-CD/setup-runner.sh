#!/bin/bash
# ============================================================
#  SETUP GITHUB SELF-HOSTED RUNNER trên VPS
#  Chạy 1 lần duy nhất: bash CI-CD/setup-runner.sh
# ============================================================
set -e

echo "📦 Cài Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "📦 Cài PM2 global..."
sudo npm install pm2 -g

echo "📁 Tạo thư mục runner..."
mkdir -p ~/actions-runner && cd ~/actions-runner

echo "⬇️  Tải GitHub Actions Runner..."
# Lấy version mới nhất
RUNNER_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | grep '"tag_name"' | sed 's/.*"v\([^"]*\)".*/\1/')
curl -o actions-runner-linux-x64.tar.gz -L \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
tar xzf ./actions-runner-linux-x64.tar.gz
rm actions-runner-linux-x64.tar.gz

echo ""
echo "✅ Tải xong! Giờ chạy lệnh sau (thay TOKEN bằng token từ GitHub):"
echo ""
echo "  cd ~/actions-runner"
echo "  RUNNER_ALLOW_RUNASROOT=true ./config.sh \\"
echo "    --url https://github.com/YOUR_USER/YOUR_REPO \\"
echo "    --token YOUR_TOKEN \\"
echo "    --labels 'self-hosted,Linux' \\"
echo "    --unattended"
echo ""
echo "  # Cài làm service (tự khởi động khi reboot)"
echo "  sudo ./svc.sh install"
echo "  sudo ./svc.sh start"
echo ""
echo "📌 Lấy token tại:"
echo "   GitHub repo > Settings > Actions > Runners > New self-hosted runner"
