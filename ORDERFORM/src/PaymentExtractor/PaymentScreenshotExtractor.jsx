import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchPaymentExtractions,
  fetchPaymentExtractorStats,
  updatePaymentExtractionRecord,
  approvePaymentRecord,
  rejectPaymentRecord,
  retryPaymentOcr,
  retryGoogleSheetsSync,
  getAuthorizedImageUrl,
} from './paymentExtractorApi';
import PaymentUploadPanel from './PaymentUploadPanel';
import PaymentVerificationModal from './PaymentVerificationModal';

export default function PaymentScreenshotExtractor() {
  const userRole = localStorage.getItem('role') || 'Admin';
  const canApprove = ['Admin', 'Account', 'Sales Manager'].includes(userRole);

  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });
  const [stats, setStats] = useState({
    totalUploaded: 0,
    successfullyExtracted: 0,
    awaitingVerification: 0,
    approvedRecords: 0,
    failedExtractions: 0,
    successfullySynchronized: 0,
  });
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Inline row edits state { [recordId]: { amount, transactionId, payerName, beneficiaryName, transactionDate } }
  const [inlineEdits, setInlineEdits] = useState({});
  const [activeRecordModal, setActiveRecordModal] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [busyRowId, setBusyRowId] = useState(null);

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
  }, []);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prev) => ({ ...prev, show: false }));
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  const loadData = useCallback(
    async (pageToLoad = pagination.page, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [listRes, statsRes] = await Promise.all([
          fetchPaymentExtractions({
            page: pageToLoad,
            limit: pagination.limit,
            search: search.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
          }),
          fetchPaymentExtractorStats(),
        ]);

        if (listRes.success) {
          setRecords(listRes.records || []);
          setPagination(listRes.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
        }
        if (statsRes.success && statsRes.stats) {
          setStats(statsRes.stats);
        }
      } catch (err) {
        if (!silent) {
          showNotification(
            err.response?.data?.message || err.message || 'Failed to load payment records',
            'error'
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [pagination.page, pagination.limit, search, startDate, endDate, showNotification]
  );

  useEffect(() => {
    loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  // Auto-poll every 3.5 seconds if any visible record is in PROCESSING or PENDING state
  useEffect(() => {
    const hasProcessing = records.some(
      (r) => r.extractionStatus === 'PROCESSING' || r.extractionStatus === 'PENDING'
    );
    if (!hasProcessing) return undefined;

    const interval = setInterval(() => {
      loadData(pagination.page, true);
    }, 3500);

    return () => clearInterval(interval);
  }, [records, pagination.page, loadData]);

  const handleInlineFieldChange = (recordId, field, value) => {
    setInlineEdits((prev) => ({
      ...prev,
      [recordId]: {
        ...(prev[recordId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSaveInlineRow = async (rec) => {
    const edits = inlineEdits[rec._id];
    if (!edits) return;
    setBusyRowId(rec._id);
    try {
      const ed = rec.extractedData || {};
      const payload = {
        extractedData: {
          payerName: edits.payerName !== undefined ? edits.payerName : ed.payerName,
          beneficiaryName:
            edits.beneficiaryName !== undefined ? edits.beneficiaryName : ed.beneficiaryName,
          amount:
            edits.amount !== undefined
              ? edits.amount === ''
                ? null
                : Number(edits.amount)
              : ed.amount,
          transactionId:
            edits.transactionId !== undefined ? edits.transactionId : ed.transactionId,
          transactionDate:
            edits.transactionDate !== undefined ? edits.transactionDate : ed.transactionDate,
          paymentMethod:
            edits.paymentMethod !== undefined ? edits.paymentMethod : ed.paymentMethod,
        },
      };
      await updatePaymentExtractionRecord(rec._id, payload);
      setInlineEdits((prev) => {
        const next = { ...prev };
        delete next[rec._id];
        return next;
      });
      showNotification(`Saved changes for ${rec.crmPaymentId}`, 'success');
      loadData(pagination.page, true);
    } catch (err) {
      showNotification(
        err.response?.data?.message || err.message || 'Failed to save row edits',
        'error'
      );
    } finally {
      setBusyRowId(null);
    }
  };

  const handleQuickApprove = async (rec) => {
    setBusyRowId(rec._id);
    try {
      if (inlineEdits[rec._id]) {
        await handleSaveInlineRow(rec);
      }
      const res = await approvePaymentRecord(rec._id);
      showNotification(res.message || `Approved ${rec.crmPaymentId}`, 'success');
      loadData(pagination.page, true);
    } catch (err) {
      if (err.response?.status === 409 && err.response?.data?.code === 'DUPLICATE_DETECTED') {
        showNotification(
          'Duplicate detected! Opening verification modal to inspect matched record.',
          'error'
        );
        setActiveRecordModal(rec);
      } else {
        showNotification(
          err.response?.data?.message || err.message || 'Approval failed',
          'error'
        );
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleQuickReject = async (rec) => {
    const reason = window.prompt(
      `Enter rejection reason for ${rec.crmPaymentId}:`,
      'Unreadable or invalid payment screenshot'
    );
    if (!reason || !reason.trim()) return;
    setBusyRowId(rec._id);
    try {
      await rejectPaymentRecord(rec._id, reason.trim());
      showNotification(`Rejected ${rec.crmPaymentId}`, 'success');
      loadData(pagination.page, true);
    } catch (err) {
      showNotification(
        err.response?.data?.message || err.message || 'Rejection failed',
        'error'
      );
    } finally {
      setBusyRowId(null);
    }
  };

  const handleQuickRetryOcr = async (rec) => {
    setBusyRowId(rec._id);
    try {
      await retryPaymentOcr(rec._id);
      showNotification(`Re-ran OCR for ${rec.crmPaymentId}`, 'success');
      loadData(pagination.page, true);
    } catch (err) {
      showNotification(
        err.response?.data?.message || err.message || 'OCR retry failed',
        'error'
      );
    } finally {
      setBusyRowId(null);
    }
  };

  const handleQuickRetrySync = async (rec) => {
    setBusyRowId(rec._id);
    try {
      const res = await retryGoogleSheetsSync(rec._id);
      showNotification(res.message || `Synced ${rec.crmPaymentId}`, 'success');
      loadData(pagination.page, true);
    } catch (err) {
      showNotification(
        err.response?.data?.message || err.message || 'Sync failed',
        'error'
      );
      loadData(pagination.page, true);
    } finally {
      setBusyRowId(null);
    }
  };

  const summaryCards = [
    {
      label: 'Total Uploaded Images',
      value: stats.totalUploaded,
      color: '#003366',
      bg: '#eff6ff',
      border: '#bfdbfe',
      icon: '🖼️',
    },
    {
      label: 'Successfully Extracted',
      value: stats.successfullyExtracted,
      color: '#047857',
      bg: '#ecfdf5',
      border: '#a7f3d0',
      icon: '✨',
    },
    {
      label: 'Awaiting Verification',
      value: stats.awaitingVerification,
      color: '#b45309',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: '⏳',
    },
    {
      label: 'Approved Records',
      value: stats.approvedRecords,
      color: '#15803d',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: '✅',
    },
    {
      label: 'Failed Extractions',
      value: stats.failedExtractions,
      color: '#b91c1c',
      bg: '#fef2f2',
      border: '#fecaca',
      icon: '⚠️',
    },
    {
      label: 'Synced to Sheet',
      value: stats.successfullySynchronized,
      color: '#0f766e',
      bg: '#f0fdfa',
      border: '#99f6e4',
      icon: '📊',
    },
  ];

  return (
    <div style={{ padding: '16px', maxWidth: '1550px', margin: '0 auto', fontFamily: 'inherit' }}>
      {/* Notification Toast */}
      {notification.show && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 2000,
            backgroundColor: notification.type === 'error' ? '#dc2626' : '#059669',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            fontSize: '14px',
            fontWeight: 600,
            maxWidth: '480px',
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#003366', fontSize: '24px', fontWeight: 800 }}>
            Payment Screenshot Extractor
          </h2>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '14px' }}>
            Upload WhatsApp payment screenshots, automatically extract UPI & Bank details, verify fields, and synchronize approved payments.
          </p>
        </div>
      </div>

      {/* 6 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginBottom: '24px',
        }}
      >
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              backgroundColor: card.bg,
              border: `1px solid ${card.border}`,
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                {card.label}
              </div>
              <div
                style={{
                  fontSize: '26px',
                  fontWeight: 800,
                  color: card.color,
                  marginTop: '4px',
                }}
              >
                {card.value}
              </div>
            </div>
            <div style={{ fontSize: '26px' }}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Upload Panel */}
      <PaymentUploadPanel
        onUploadCompleted={() => loadData(1)}
        showNotification={showNotification}
      />

      {/* Search & Date Filters Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: '1 1 280px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Search UTR, Payer, Beneficiary, Group, or CRM ID
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              placeholder="Search UTR / Payer / Beneficiary..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadData(1);
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
            <button
              type="button"
              onClick={() => loadData(1)}
              style={{
                backgroundColor: '#003366',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Uploaded From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Uploaded To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: '7px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
            }}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStartDate('');
            setEndDate('');
            loadData(1);
          }}
          style={{
            backgroundColor: '#f1f5f9',
            color: '#334155',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
      </div>

      {/* Editable Extraction Results Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: '1150px',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#003366',
                  color: '#ffffff',
                  textAlign: 'left',
                }}
              >
                <th style={{ padding: '12px 10px' }}>Preview</th>
                <th style={{ padding: '12px 10px' }}>CRM ID & Source</th>
                <th style={{ padding: '12px 10px' }}>Paid To / Beneficiary</th>
                <th style={{ padding: '12px 10px' }}>Payer / Debited From</th>
                <th style={{ padding: '12px 10px' }}>Amount (INR)</th>
                <th style={{ padding: '12px 10px' }}>Txn Date & Time</th>
                <th style={{ padding: '12px 10px' }}>UTR</th>
                <th style={{ padding: '12px 10px' }}>Method / App</th>
                <th style={{ padding: '12px 10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    Loading payment extraction records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No payment screenshot records found. Upload screenshots above to begin extraction.
                  </td>
                </tr>
              ) : (
                records.map((rec) => {
                  const ed = rec.extractedData || {};
                  const sm = rec.sourceMetadata || {};
                  const edits = inlineEdits[rec._id] || {};
                  const isApproved = rec.reviewStatus === 'APPROVED';
                  const isBusy = busyRowId === rec._id;
                  const hasPendingInlineEdits = Object.keys(edits).length > 0;

                  const valBeneficiary =
                    edits.beneficiaryName !== undefined
                      ? edits.beneficiaryName
                      : ed.beneficiaryName || '';
                  const valPayer =
                    edits.payerName !== undefined ? edits.payerName : ed.payerName || '';
                  const valAmount =
                    edits.amount !== undefined
                      ? edits.amount
                      : ed.amount !== null && ed.amount !== undefined
                      ? String(ed.amount)
                      : '';
                  const valDate =
                    edits.transactionDate !== undefined
                      ? edits.transactionDate
                      : ed.transactionDate || '';
                  const valTxnId =
                    edits.transactionId !== undefined
                      ? edits.transactionId
                      : ed.transactionId || '';

                  return (
                    <tr
                      key={rec._id}
                      style={{
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: rec.duplicateCheck?.isDuplicate
                          ? '#fffbeb'
                          : isApproved
                          ? '#f0fdf4'
                          : '#ffffff',
                      }}
                    >
                      {/* Thumbnail & View Original */}
                      <td style={{ padding: '10px' }}>
                        <div
                          onClick={() => setActiveRecordModal(rec)}
                          title="Click to inspect full screenshot & verify"
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer',
                            backgroundColor: '#0f172a',
                          }}
                        >
                          <img
                            src={rec.image?.cloudinaryUrl || getAuthorizedImageUrl(rec._id)}
                            alt={rec.crmPaymentId}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                      </td>

                      {/* CRM ID & Source */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700, color: '#003366' }}>{rec.crmPaymentId}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          By: {rec.uploadedBy?.userName}
                        </div>
                        {(sm.whatsappGroupName || sm.whatsappSenderName) && (
                          <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                            WA: {sm.whatsappGroupName || '—'} / {sm.whatsappSenderName || '—'}
                          </div>
                        )}
                        {rec.duplicateCheck?.isDuplicate && (
                          <div
                            style={{
                              marginTop: '4px',
                              display: 'inline-block',
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              border: '1px solid #f59e0b',
                              borderRadius: '4px',
                              padding: '1px 6px',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ DUPLICATE ({rec.duplicateCheck.duplicateType})
                          </div>
                        )}
                      </td>

                      {/* Paid To / Beneficiary */}
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={valBeneficiary}
                          placeholder="Beneficiary Name"
                          onChange={(e) =>
                            handleInlineFieldChange(rec._id, 'beneficiaryName', e.target.value)
                          }
                          style={{
                            width: '155px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        />
                      </td>

                      {/* Payer Name / Debited Account */}
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={valPayer}
                          placeholder="Payer / Account"
                          onChange={(e) =>
                            handleInlineFieldChange(rec._id, 'payerName', e.target.value)
                          }
                          style={{
                            width: '135px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                          }}
                        />
                      </td>

                      {/* Amount INR */}
                      <td style={{ padding: '10px' }}>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isApproved}
                          value={valAmount}
                          placeholder="₹ Amount"
                          onChange={(e) =>
                            handleInlineFieldChange(rec._id, 'amount', e.target.value)
                          }
                          style={{
                            width: '100px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: `1.5px solid ${!valAmount ? '#ef4444' : '#cbd5e1'}`,
                            backgroundColor: !valAmount ? '#fef2f2' : '#fff',
                            fontSize: '13px',
                            fontWeight: 700,
                          }}
                        />
                      </td>

                      {/* Transaction Date & Time */}
                      <td style={{ padding: '10px' }}>
                        <input
                          type="date"
                          disabled={isApproved}
                          value={valDate}
                          onChange={(e) =>
                            handleInlineFieldChange(rec._id, 'transactionDate', e.target.value)
                          }
                          style={{
                            width: '128px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                          }}
                        />
                        {ed.transactionTime && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                            {ed.transactionTime}
                          </div>
                        )}
                      </td>

                      {/* UTR */}
                      <td style={{ padding: '10px' }}>
                        <input
                          type="text"
                          disabled={isApproved}
                          value={valTxnId}
                          placeholder="UTR"
                          onChange={(e) =>
                            handleInlineFieldChange(rec._id, 'transactionId', e.target.value)
                          }
                          style={{
                            width: '150px',
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '12px',
                            fontFamily: 'monospace',
                          }}
                        />
                        {ed.bankReference && (
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>
                            Transaction Id: {ed.bankReference}
                          </div>
                        )}
                      </td>

                      {/* Method & App */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {ed.paymentMethod || 'UPI'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {ed.paymentApp || '—'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setActiveRecordModal(rec)}
                            style={{
                              backgroundColor: '#003366',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Inspect / Edit
                          </button>

                          {hasPendingInlineEdits && !isApproved && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleSaveInlineRow(rec)}
                              style={{
                                backgroundColor: '#2563eb',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                          )}

                          {!isApproved && canApprove && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickApprove(rec)}
                                style={{
                                  backgroundColor: '#16a34a',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickReject(rec)}
                                style={{
                                  backgroundColor: '#fee2e2',
                                  color: '#b91c1c',
                                  border: '1px solid #fca5a5',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {!isApproved && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleQuickRetryOcr(rec)}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '5px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              ↻ OCR
                            </button>
                          )}

                          {isApproved &&
                            rec.googleSheetsSync?.status !== 'SYNCED' &&
                            canApprove && (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleQuickRetrySync(rec)}
                                style={{
                                  backgroundColor: '#0f766e',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '5px 10px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                ↻ Sync
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            fontSize: '13px',
          }}
        >
          <div>
            Showing page <strong>{pagination.page}</strong> of{' '}
            <strong>{pagination.totalPages}</strong> ({pagination.totalCount} total records)
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadData(pagination.page - 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: pagination.page <= 1 ? '#f1f5f9' : '#fff',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadData(pagination.page + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor:
                  pagination.page >= pagination.totalPages ? '#f1f5f9' : '#fff',
                cursor:
                  pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Verification Side-by-Side Modal */}
      {activeRecordModal && (
        <PaymentVerificationModal
          record={activeRecordModal}
          onClose={() => setActiveRecordModal(null)}
          onRecordUpdated={(updatedRec) => {
            setActiveRecordModal(updatedRec);
            loadData(pagination.page, true);
          }}
          showNotification={showNotification}
        />
      )}
    </div>
  );
}
