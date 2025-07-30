// Backend/workers/emailWorker.js
const { Worker } = require('worker_threads');
const path = require('path');

class EmailWorkerPool {
    constructor(poolSize = 2) {
        this.poolSize = poolSize;
        this.workers = [];
        this.availableWorkers = [];
        this.queue = [];
        this.init();
    }

    init() {
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(path.join(__dirname, 'emailParserWorker.js'));
            worker.on('message', (result) => {
                const { resolve, reject } = this.queue.shift();
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result.data);
                }
                this.availableWorkers.push(worker);
                this.processQueue();
            });
            worker.on('error', (error) => {
                console.error('Worker error:', error);
                // Riavvia il worker
                this.replaceWorker(worker);
            });
            this.workers.push(worker);
            this.availableWorkers.push(worker);
        }
    }

    replaceWorker(deadWorker) {
        const index = this.workers.indexOf(deadWorker);
        if (index !== -1) {
            const newWorker = new Worker(path.join(__dirname, 'emailParserWorker.js'));
            newWorker.on('message', (result) => {
                const { resolve, reject } = this.queue.shift();
                if (result.error) {
                    reject(new Error(result.error));
                } else {
                    resolve(result.data);
                }
                this.availableWorkers.push(newWorker);
                this.processQueue();
            });
            this.workers[index] = newWorker;
            this.availableWorkers.push(newWorker);
        }
    }

    async parseEmail(filePath, options = {}) {
        return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject, filePath, options });
            this.processQueue();
        });
    }

    processQueue() {
        if (this.queue.length === 0 || this.availableWorkers.length === 0) {
            return;
        }
        
        const { filePath, options } = this.queue[0];
        const worker = this.availableWorkers.shift();
        worker.postMessage({ filePath, options });
    }

    terminate() {
        this.workers.forEach(worker => worker.terminate());
    }
}

// Singleton instance
let workerPool = null;

function getEmailWorkerPool() {
    if (!workerPool) {
        workerPool = new EmailWorkerPool(2); // 2 workers
    }
    return workerPool;
}

module.exports = { getEmailWorkerPool };