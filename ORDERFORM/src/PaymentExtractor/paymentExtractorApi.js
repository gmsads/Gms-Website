import axios from 'axios';

const BASE_URL = '/api/payment-extractor';

function getAuthHeaders() {
  const userName = localStorage.getItem('userName') || 'CRM User';
  const userRole = localStorage.getItem('role') || 'Admin';
  return {
    'x-user-name': userName,
    'x-user-role': userRole,
  };
}

export async function uploadPaymentScreenshots(files, metadata = {}, onUploadProgress) {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('screenshots', file);
  });
  if (metadata.whatsappGroupName) {
    formData.append('whatsappGroupName', metadata.whatsappGroupName);
  }
  if (metadata.whatsappSenderName) {
    formData.append('whatsappSenderName', metadata.whatsappSenderName);
  }
  if (metadata.notes) {
    formData.append('notes', metadata.notes);
  }
  if (metadata.syncOcr !== undefined) {
    formData.append('syncOcr', String(metadata.syncOcr));
  }

  const res = await axios.post(`${BASE_URL}/upload`, formData, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
  return res.data;
}

export async function fetchPaymentExtractions(params = {}) {
  const res = await axios.get(BASE_URL, {
    params,
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function fetchPaymentExtractorStats() {
  const res = await axios.get(`${BASE_URL}/stats`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function fetchGoogleSheetsStatus() {
  const res = await axios.get(`${BASE_URL}/google-sheets/status`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function fetchPaymentExtractionById(id) {
  const res = await axios.get(`${BASE_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function updatePaymentExtractionRecord(id, payload) {
  const res = await axios.patch(`${BASE_URL}/${id}`, payload, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function retryPaymentOcr(id) {
  const res = await axios.post(
    `${BASE_URL}/${id}/retry-ocr`,
    {},
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function approvePaymentRecord(id, options = {}) {
  const res = await axios.post(`${BASE_URL}/${id}/approve`, options, {
    headers: getAuthHeaders(),
  });
  return res.data;
}

export async function rejectPaymentRecord(id, reason) {
  const res = await axios.post(
    `${BASE_URL}/${id}/reject`,
    { reason },
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export async function retryGoogleSheetsSync(id) {
  const res = await axios.post(
    `${BASE_URL}/${id}/sync`,
    {},
    { headers: getAuthHeaders() }
  );
  return res.data;
}

export function getAuthorizedImageUrl(id) {
  const userName = encodeURIComponent(localStorage.getItem('userName') || 'CRM User');
  const userRole = encodeURIComponent(localStorage.getItem('role') || 'Admin');
  return `${BASE_URL}/${id}/image?userName=${userName}&userRole=${userRole}`;
}
