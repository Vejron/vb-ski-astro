<script setup lang="ts">
import { ref } from 'vue';
import QRCode from 'qrcode';

interface Props {
  url: string;
}

const props = defineProps<Props>();
const showDialog = ref(false);
const qrCodeDataUrl = ref('');

const generateQRCode = async () => {
  try {
    qrCodeDataUrl.value = await QRCode.toDataURL(props.url, {
      width: 300,
      margin: 2,
    });
    showDialog.value = true;
  } catch (err) {
    console.error('Error generating QR code:', err);
  }
};

const closeDialog = () => {
  showDialog.value = false;
};
</script>

<template>
  <div>
    <button @click="generateQRCode" class="btn-qr">
      Show QR Code
    </button>

    <Teleport to="body">
      <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h2>QR Code</h2>
            <button @click="closeDialog" class="close-btn" aria-label="Close dialog">
              ×
            </button>
          </div>
          <div class="qr-container">
            <img :src="qrCodeDataUrl" alt="QR Code" />
          </div>
          <p class="url-text">{{ url }}</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.btn-qr {
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-qr:hover {
  background-color: #2563eb;
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-content {
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  max-width: 90%;
  max-height: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #1f2937;
}

.qr-container {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.qr-container img {
  max-width: 100%;
  height: auto;
}

.url-text {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  word-break: break-all;
  margin: 0;
}
</style>
