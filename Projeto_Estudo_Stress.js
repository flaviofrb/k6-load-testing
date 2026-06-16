import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';

// ─── Métricas customizadas ────────────────────────────────────────────────────
const taxaSucesso = new Rate('login_sucesso');
const tempoLogin = new Trend('login_tempo_ms', true);
const loginsFalhos = new Counter('logins_falhos');

// ─── Usuários do CSV ──────────────────────────────────────────────────────────
const usuarios = new SharedArray('usuarios', function () {
    return papaparse.parse(open('./usuarios.csv'), { header: true }).data.filter(u => u.email);
});

// ─── Cenário escalonado ───────────────────────────────────────────────────────
export const options = {
    scenarios: {
        stress: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 100 },
                { duration: '60s', target: 100 },
                { duration: '10s', target: 200 },
                { duration: '60s', target: 200 },
                { duration: '10s', target: 50 },
                { duration: '60s', target: 50 },
                { duration: '10s', target: 200 },
                { duration: '60s', target: 200 },
                { duration: '20s', target: 0 },
            ],
        },
    },

    thresholds: {
        'http_req_duration{endpoint:login}': [
            { threshold: 'p(95)<3000', abortOnFail: false },
            { threshold: 'p(99)<8000', abortOnFail: false },
        ],
        'http_req_duration{endpoint:dashboard}': [
            { threshold: 'p(95)<5000', abortOnFail: false },
        ],
        'login_sucesso': [{
            threshold: 'rate>0.90',
            abortOnFail: true,
            delayAbortEval: '30s',
        }],
        'login_tempo_ms': [{
            threshold: 'p(95)<10000',
            abortOnFail: false,
        }],
        'http_req_failed': [{
            threshold: 'rate<0.10',
            abortOnFail: true,
            delayAbortEval: '30s',
        }],
    },
};

const API = __ENV.API_URL;

// ─── Fluxo principal ──────────────────────────────────────────────────────────
export default function () {
    const usuario = usuarios[__VU % usuarios.length];

    // ── Login ─────────────────────────────────────────────────────────────────
    const inicio = Date.now();

    const res = http.post(
        `${API}/auth/login`,
        JSON.stringify({ email: usuario.email, password: usuario.password }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            tags: { endpoint: 'login' },
        }
    );

    const duracao = Date.now() - inicio;
    tempoLogin.add(duracao);

    const ok = check(res, {
        'login: status 200': (r) => r.status === 200,
        'login: tem token': (r) => {
            try { return !!JSON.parse(r.body).token; } catch (_) { return false; }
        },
    });

    if (!ok) {
        loginsFalhos.add(1);
        taxaSucesso.add(false);
        console.warn(`[VU ${__VU}] ❌ Login falhou — ${usuario.email} — HTTP ${res.status} — ${(duracao / 1000).toFixed(2)}s`);
        sleep(1);
        return;
    }

    taxaSucesso.add(true);

    let token = '';
    try { token = JSON.parse(res.body).token; } catch (_) { }

    if (duracao > 7000) {
        console.log(`[VU ${__VU}] ⚠️  Login lento — ${(duracao / 1000).toFixed(2)}s — ${usuario.email}`);
    }

    sleep(1);

    // ── Dashboard ─────────────────────────────────────────────────────────────
    const dash = http.get(`${API}/auth/me`, {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        tags: { endpoint: 'dashboard' },
    });

    check(dash, {
        'dashboard: status 200': (r) => r.status === 200,
    });

    sleep(2);
}

// ─── Relatório final ──────────────────────────────────────────────────────────
export function handleSummary(data) {
    const t = data.metrics;
    const fmt = (v) => v !== undefined ? (v / 1000).toFixed(2) + 's' : 'N/A';

    const total = t.http_reqs?.values?.count ?? 0;
    const rps = t.http_reqs?.values?.rate?.toFixed(1) ?? 'N/A';
    const falhas = t.logins_falhos?.values?.count ?? 0;
    const taxaOk = t.login_sucesso?.values?.rate;

    const p50Login = t.login_tempo_ms?.values?.med;
    const p95Login = t.login_tempo_ms?.values?.['p(95)'];
    const maxLogin = t.login_tempo_ms?.values?.max;

    const p95LoginTag = t['http_req_duration{endpoint:login}']?.values?.['p(95)'];
    const p99LoginTag = t['http_req_duration{endpoint:login}']?.values?.['p(99)'];
    const p95DashTag = t['http_req_duration{endpoint:dashboard}']?.values?.['p(95)'];

    const loginOk = (taxaOk ?? 0) > 0.90 && (p95Login ?? Infinity) < 10000;
    const loginTagOk = (p95LoginTag ?? Infinity) < 3000;
    const dashTagOk = (p95DashTag ?? Infinity) < 5000;
    const aprovado = loginOk && loginTagOk && dashTagOk;

    const linhas = [
        '',
        '══════════════════════════════════════════════════════════════',
        '   🔐  STRESS TEST — LOGIN — PROJETO_ESTUDO                  ',
        '══════════════════════════════════════════════════════════════',
        '',
        `  Resultado geral  : ${aprovado ? '✅ APROVADO' : '❌ REPROVADO'}`,
        '',
        '  ── Carga aplicada ──────────────────────────────────────────',
        '  100 → 200 → 50 → 200 usuários simultâneos',
        '',
        '  ── Resumo geral ─────────────────────────────────────────────',
        `  Total requisições : ${total}`,
        `  Req/segundo       : ${rps}`,
        `  Logins falhos     : ${falhas}`,
        `  Taxa de sucesso   : ${taxaOk !== undefined ? (taxaOk * 100).toFixed(1) + '%' : 'N/A'}`,
        '',
        '  ── Tempo de login (métrica customizada) ─────────────────────',
        `  Mediana (p50) : ${fmt(p50Login)}`,
        `  Percentil p95 : ${fmt(p95Login)}   ← threshold: < 10s`,
        `  Máximo        : ${fmt(maxLogin)}`,
        '',
        '  ── Por endpoint (http_req_duration tagueada) ─────────────────',
        `  Login  p95 : ${fmt(p95LoginTag)}   ← threshold: < 3s  ${loginTagOk ? '✅' : '❌'}`,
        `  Login  p99 : ${fmt(p99LoginTag)}   ← threshold: < 8s`,
        `  Dashboard p95 : ${fmt(p95DashTag)}   ← threshold: < 5s  ${dashTagOk ? '✅' : '❌'}`,
        '',
        '══════════════════════════════════════════════════════════════',
        '',
    ].join('\n');

    console.log(linhas);
    return {
        stdout: linhas,
        'resultado_stress.json': JSON.stringify(data, null, 2),
    };
}
