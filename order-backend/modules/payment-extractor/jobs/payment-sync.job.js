const { syncRecordToGoogleSheets } = require('../services/payment-sync.service');

const syncQueue = [];
let activeSyncWorkers = 0;
const MAX_CONCURRENT_SYNC = 1; // Serialize sheet appends to avoid Google Sheets API rate limits

function drainSyncQueue() {
  while (activeSyncWorkers < MAX_CONCURRENT_SYNC && syncQueue.length > 0) {
    const job = syncQueue.shift();
    activeSyncWorkers++;
    syncRecordToGoogleSheets(job.recordId, job.actor)
      .then((res) => {
        if (job.resolve) job.resolve(res);
      })
      .catch((err) => {
        if (job.reject) job.reject(err);
      })
      .finally(() => {
        activeSyncWorkers--;
        setImmediate(drainSyncQueue);
      });
  }
}

/**
 * Enqueues a Google Sheets sync job.
 */
function enqueuePaymentSyncJob(recordId, actor) {
  return new Promise((resolve, reject) => {
    syncQueue.push({ recordId, actor, resolve, reject });
    setImmediate(drainSyncQueue);
  });
}

module.exports = {
  enqueuePaymentSyncJob,
};
