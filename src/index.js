if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(reg => {
      console.log('Ø_SYSTEM: SERVICE_WORKER_LOCKED');
    }).catch(err => {
      console.log('µ_SYNC_ERROR: ', err);
    });
  });
}