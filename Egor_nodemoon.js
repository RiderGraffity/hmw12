const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const args = process.argv.slice(2);

const watchPaths = [];
let script = null;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--watch') {
        if (!args[i + 1]) {
            console.error('После --watch нужно указать файл или папку');
            process.exit(1);
        }

        watchPaths.push(path.resolve(args[i + 1]));
        i++;
    } else {
        script = args[i];
    }
}

if (!script) {
    console.error('Укажите файл, который нужно запускать');
    console.error('Пример: node your_nodemon.js --watch ./src index.js');
    process.exit(1);
}

if (watchPaths.length === 0) {
    console.error('Укажите хотя бы один путь для наблюдения');
    console.error('Пример: node your_nodemon.js --watch ./src index.js');
    process.exit(1);
}

let child = null;
let restartTimer = null;

function start() {
    console.log(`\nЗапуск: ${script}`);

    child = spawn(process.execPath, [path.resolve(script)], {
        stdio: 'inherit'
    });

    child.on('exit', (code, signal) => {
        if (signal) {
            console.log(`Процесс завершён сигналом ${signal}`);
        } else {
            console.log(`Процесс завершён с кодом ${code}`);
        }
    });
}

function restart() {
    clearTimeout(restartTimer);

    restartTimer = setTimeout(() => {
        console.log('\nИзменение обнаружено. Перезапускаем...');

        if (child) {
            child.kill();
        }

        start();
    }, 100);
}

function watch(target) {
    if (!fs.existsSync(target)) {
        console.error(`Не найден путь: ${target}`);
        return;
    }

    const stats = fs.statSync(target);

    if (stats.isFile()) {
        fs.watch(target, (eventType) => {
            if (eventType === 'change') {
                restart();
            }
        });

        console.log(`Следим за файлом: ${target}`);
    } else if (stats.isDirectory()) {
        fs.watch(
            target,
            { recursive: true },
            (eventType, filename) => {
                if (eventType === 'change' || eventType === 'rename') {
                    console.log(`Изменён файл: ${filename}`);
                    restart();
                }
            }
        );

        console.log(`Следим за папкой: ${target}`);
    }
}

start();

for (const target of watchPaths) {
    watch(target);
}

process.on('SIGINT', () => {
    console.log('\nОстанавливаем nodemon...');

    if (child) {
        child.kill();
    }

    process.exit(0);
});

