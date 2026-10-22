import React, { useState, useEffect } from 'react';
import {
  getAuthorizedImageUrl,
  updatePaymentExtractionRecord,
  approvePaymentRecord,
  rejectPaymentRecord,
  retryPaymentOcr,
  retryGoogleSheetsSync,
} from './paymentExtractorApi';

export default function PaymentVerificationModal({
  record,
  onClose,
  onRecordUpdated,
  showNotification,
}) {
  const userRole = localStorage.getItem('role') || 'Admin';
  const canApprove = ['Admin', 'Account', 'Sales Manager'].includes(userRole);
  const isApproved = record?.reviewStatus === 'APPROVED';

  const [form, setForm] = useState({
    payerName: '',
    beneficiaryName: '',
    amount: '',
    currency: 'INR',
    transactionDate: '',
    transactionTime: '',
    transactionId: '',
    bankReference: '',
    paymentMethod: 'UPI',
    paymentApp: '',
    whatsappGroupName: '',
    whatsappSenderName: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [retryingOcr, setRetryingOcr] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Duplicate override state
  const [duplicateConflict, setDuplicateConflict] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    if (!record) return;
    const ed = record.extractedData || {};
    const sm = record.sourceMetadata || {};
    setForm({
      payerName: ed.payerName || '',
      beneficiaryName: ed.beneficiaryName || '',
      amount: ed.amount !== null && ed.amount !== undefined ? String(ed.amount) : '',
      currency: ed.currency || 'INR',
      transactionDate: ed.transactionDate || '',
      transactionTime: ed.transactionTime || '',
      transactionId: ed.transactionId || '',
      bankReference: ed.bankReference || '',
      paymentMethod: ed.paymentMethod || 'UPI',
      paymentApp: ed.paymentApp || '',
      whatsappGroupName: sm.whatsappGroupName || '',
      whatsappSenderName: sm.whatsappSenderName || '',
      notes: sm.notes || '',
    });

    if (record.duplicateCheck?.isDuplicate) {
      setDuplicateConflict(record.duplicateCheck);
    } else {
      setDuplicateConflict(null);
    }
  }, [record]);

  if (!record) return null;

  const missingFields = record.confidence?.missingFields || [];
  const uncertainFields = record.confidence?.uncertainFields || [];

  const isFieldFlagged = (fieldName) =>
    missingFields.includes(fieldName) || uncertainFields.includes(fieldName);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildUpdatePayload = () => {
    const payload = {};

    if (!isApproved) {
      payload.extractedData = {
        payerName: form.payerName || null,
        beneficiaryName: form.beneficiaryName || null,
        amount: form.amount !== '' ? Number(form.amount) : null,
        currency: form.currency || 'INR',
        transactionDate: form.transactionDate || null,
        transactionTime: form.transactionTime || null,
        transactionId: form.transactionId || null,
        bankReference: form.bankReference || null,
        paymentMethod: form.paymentMethod || null,
        paymentApp: form.paymentApp || null,
      };
      payload.sourceMetadata = {
        whatsappGroupName: form.whatsappGroupName || null,
        whatsappSenderName: form.whatsappSenderName || null,
        notes: form.notes || null,
      };
    }

    return payload;
  };

  const handleSaveEdits = async () => {
    setSaving(true);
    try {
      const payload = buildUpdatePayload();
      const res = await updatePaymentExtractionRecord(record._id, payload);
      if (showNotification) showNotification('Changes saved successfully.', 'success');
      if (onRecordUpdated && res.record) onRecordUpdated(res.record);
    } catch (err) {
      if (showNotification) {
        showNotification(
          err.response?.data?.message || err.message || 'Failed to save changes',
          'error'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (withOverride = false) => {
    setApproving(true);
    try {
      // Save any pending edits first before approving
      if (!isApproved) {
        await updatePaymentExtractionRecord(record._id, buildUpdatePayload());
      }

      const res = await approvePaymentRecord(record._id, {
        overrideDuplicate: withOverride,
        overrideReason: withOverride ? overrideReason : undefined,
      });

      if (showNotification) {
        showNotification(res.message || 'Payment record approved!', 'success');
      }
      if (onRecordUpdated && res.record) onRecordUpdated(res.record);
      onClose();
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.code === 'DUPLICATE_DETECTED') {
        setDuplicateConflict(err.response.data.duplicateCheck);
        if (showNotification) {
          showNotification(err.response.data.message, 'error');
        }
      } else if (showNotification) {
        showNotification(
          err.response?.data?.message || err.message || 'Failed to approve payment record',
          'error'
        );
      }
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim() || rejectionReason.trim().length < 2) {
      if (showNotification) showNotification('Please enter a rejection reason.', 'error');
      return;
    }
    setRejecting(true);
    try {
      const res = await rejectPaymentRecord(record._id, rejectionReason.trim());
      if (showNotification) showNotification('Payment record rejected.', 'success');
      if (onRecordUpdated && res.record) onRecordUpdated(res.record);
      onClose();
    } catch (err) {
      if (showNotification) {
        showNotification(
          err.response?.data?.message || err.message || 'Failed to reject record',
          'error'
        );
      }
    } finally {
      setRejecting(false);
    }
  };

  const handleRetryOcr = async () => {
    setRetryingOcr(true);
    try {
      const res = await retryPaymentOcr(record._id);
      if (showNotification) showNotification('OCR extraction completed.', 'success');
      if (onRecordUpdated && res.record) onRecordUpdated(res.record);
    } catch (err) {
      if (showNotification) {
        showNotification(
          err.response?.data?.message || err.message || 'Failed to retry OCR',
          'error'
        );
      }
    } finally {
      setRetryingOcr(false);
    }
  };

  const handleRetrySync = async () => {
    setSyncing(true);
    try {
      const res = await retryGoogleSheetsSync(record._id);
      if (showNotification) showNotification(res.message || 'Synced to Sheet!', 'success');
      if (onRecordUpdated && res.record) onRecordUpdated(res.record);
    } catch (err) {
      const updated = err.response?.data?.record;
      if (onRecordUpdated && updated) onRecordUpdated(updated);
      if (showNotification) {
        showNotification(
          err.response?.data?.message || err.message || 'Google Sheets sync failed',
          'error'
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const matchedRecords =
    duplicateConflict?.matchedRecords ||
    duplicateConflict?.matchedRecordIds ||
    record.duplicateCheck?.matchedRecordIds ||
    [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1150px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, color: '#003366', fontSize: '18px' }}>
                Verify Payment Screenshot · {record.crmPaymentId}
              </h3>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Uploaded by <strong>{record.uploadedBy?.userName}</strong> ({record.uploadedBy?.userRole}) on{' '}
              {record.createdAt ? new Date(record.createdAt).toLocaleString() : '—'}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '8px',
              width: '34px',
              height: '34px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Side-by-side Original Image and Editable Verification Form */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '20px',
            padding: '20px 24px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {/* Left Column: Original Screenshot & Raw OCR Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                backgroundColor: '#0f172a',
                padding: '12px',
                textAlign: 'center',
                minHeight: '340px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <img
                src={record.image?.cloudinaryUrl || getAuthorizedImageUrl(record._id)}
                alt={record.image?.originalFilename || 'Payment Screenshot'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '440px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                }}
              />
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                {record.image?.originalFilename} ({Math.round((record.image?.sizeBytes || 0) / 1024)} KB)
              </div>
              <a
                href={record.image?.cloudinaryUrl || getAuthorizedImageUrl(record._id)}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#38bdf8',
                  textDecoration: 'underline',
                }}
              >
                Open Original Full-Size Screenshot in New Tab ↗
              </a>
            </div>

            {/* Raw OCR Text & Retry */}
            <div
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: '#f8fafc',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Raw OCR Text
                </span>
                {!isApproved && (
                  <button
                    type="button"
                    onClick={handleRetryOcr}
                    disabled={retryingOcr}
                    style={{
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: retryingOcr ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {retryingOcr ? 'Retrying OCR...' : '↻ Retry OCR'}
                  </button>
                )}
              </div>

              {record.lastError && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    border: '1px solid #fca5a5',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    marginBottom: '8px',
                  }}
                >
                  <strong>OCR Error:</strong> {record.lastError}
                </div>
              )}

              <pre
                style={{
                  margin: 0,
                  padding: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '11px',
                  color: '#334155',
                  maxHeight: '140px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {record.rawOcrText || 'No OCR text extracted yet.'}
              </pre>
            </div>
          </div>

          {/* Right Column: Editable Structured Fields & Duplicate Alerts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Duplicate Alert Box */}
            {duplicateConflict && duplicateConflict.isDuplicate && (
              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <div style={{ fontWeight: 700, color: '#b45309', fontSize: '13px' }}>
                  ⚠️ Potential Duplicate Detected ({duplicateConflict.duplicateType})
                </div>
                <p style={{ margin: '4px 0 8px', fontSize: '12px', color: '#92400e' }}>
                  This screenshot matches an existing CRM payment record. Inspect the matched record below. To approve anyway, provide an override reason.
                </p>

                {Array.isArray(matchedRecords) && matchedRecords.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #fcd34d',
                      borderRadius: '6px',
                      padding: '8px',
                      fontSize: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    {matchedRecords.map((m, idx) => (
                      <div key={m._id || idx} style={{ marginBottom: '4px' }}>
                        <strong>{m.crmPaymentId || m._id}</strong> · Amount: ₹
                        {m.extractedData?.amount ?? '—'} · UTR:{' '}
                        <code>{m.extractedData?.transactionId || '—'}</code>
                      </div>
                    ))}
                  </div>
                )}

                {!isApproved && canApprove && (
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#92400e',
                        marginBottom: '4px',
                      }}
                    >
                      Duplicate Override Reason (Required to approve a duplicate):
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="e.g. Second installment with same screenshot reference verified by Accounts"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #f59e0b',
                          fontSize: '12px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleApprove(true)}
                        disabled={approving || overrideReason.trim().length < 3}
                        style={{
                          backgroundColor: '#d97706',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor:
                            approving || overrideReason.trim().length < 3
                              ? 'not-allowed'
                              : 'pointer',
                        }}
                      >
                        Override & Approve
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Amount (INR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled={isApproved}
                  value={form.amount}
                  onChange={(e) => handleFieldChange('amount', e.target.value)}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${!form.amount ? '#f59e0b' : '#cbd5e1'}`,
                    backgroundColor: !form.amount ? '#fffbeb' : '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  UTR
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.transactionId}
                  onChange={(e) => handleFieldChange('transactionId', e.target.value)}
                  placeholder="12-digit UTR"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${!form.transactionId ? '#f59e0b' : '#cbd5e1'}`,
                    backgroundColor: !form.transactionId ? '#fffbeb' : '#fff',
                    fontSize: '13px',
                    fontFamily: 'monospace',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Transaction Date (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  disabled={isApproved}
                  value={form.transactionDate}
                  onChange={(e) => handleFieldChange('transactionDate', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${!form.transactionDate ? '#f59e0b' : '#cbd5e1'}`,
                    backgroundColor: !form.transactionDate ? '#fffbeb' : '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Transaction Time
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.transactionTime}
                  onChange={(e) => handleFieldChange('transactionTime', e.target.value)}
                  placeholder="e.g. 09:07 PM"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Payer Name / Debited Account
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.payerName}
                  onChange={(e) => handleFieldChange('payerName', e.target.value)}
                  placeholder="Sender / Payer Name"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: `1.5px solid ${!form.payerName && isFieldFlagged('payerName') ? '#f59e0b' : '#cbd5e1'}`,
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Beneficiary / Paid-To Name
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.beneficiaryName}
                  onChange={(e) => handleFieldChange('beneficiaryName', e.target.value)}
                  placeholder="e.g. R Bala Brahma Chary"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Transaction Id
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.bankReference}
                  onChange={(e) => handleFieldChange('bankReference', e.target.value)}
                  placeholder="Transaction Id"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Payment Method
                </label>
                <select
                  disabled={isApproved}
                  value={form.paymentMethod}
                  onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  Payment App / Bank
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.paymentApp}
                  onChange={(e) => handleFieldChange('paymentApp', e.target.value)}
                  placeholder="e.g. PhonePe, Google Pay, Paytm"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  WhatsApp Group Name
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.whatsappGroupName}
                  onChange={(e) => handleFieldChange('whatsappGroupName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  WhatsApp Sender Name
                </label>
                <input
                  type="text"
                  disabled={isApproved}
                  value={form.whatsappSenderName}
                  onChange={(e) => handleFieldChange('whatsappSenderName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Google Sheets Row Info if Synced */}
            {record.googleSheetsSync?.rowReference && (
              <div
                style={{
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  backgroundColor: '#ecfdf5',
                  fontSize: '12px',
                  color: '#065f46',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <strong>Synchronized Row:</strong> {record.googleSheetsSync.rowReference}
                </span>
              </div>
            )}

            {isApproved && record.googleSheetsSync?.status !== 'SYNCED' && canApprove && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleRetrySync}
                  disabled={syncing}
                  style={{
                    backgroundColor: '#0f766e',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: syncing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {syncing ? 'Syncing...' : '↻ Sync to Sheet'}
                </button>
              </div>
            )}

            {/* Reject Reason Box */}
            {showRejectInput && !isApproved && (
              <div
                style={{
                  border: '1px solid #fca5a5',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
                  Reason for Rejecting Screenshot:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="e.g. Blurred screenshot, invalid UTR, or wrong beneficiary"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #f87171',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={rejecting}
                    style={{
                      backgroundColor: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: rejecting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={handleSaveEdits}
            disabled={saving}
            style={{
              backgroundColor: '#003366',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {!isApproved && canApprove && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRejectInput((prev) => !prev)}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '8px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Reject Record
              </button>

              <button
                type="button"
                onClick={() => handleApprove(false)}
                disabled={approving}
                style={{
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: approving ? 'not-allowed' : 'pointer',
                }}
              >
                {approving ? 'Approving & Syncing...' : '✓ Approve & Sync to Google Sheets'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
