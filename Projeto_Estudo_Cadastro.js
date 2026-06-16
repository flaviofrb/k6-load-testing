import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const cadastrosSucesso = new Counter('cadastros_sucesso');
const cadastrosFalha = new Counter('cadastros_falha');
const taxaSucesso = new Rate('taxa_sucesso');

const TOTAL_USUARIOS = 10; // 👈 altere aqui

export const options = {
  vus: 10,
  iterations: TOTAL_USUARIOS,
  thresholds: {
    'taxa_sucesso': [{ threshold: 'rate>0.95' }],
    'http_req_failed': [{ threshold: 'rate<0.05' }],
  },
};

const API = __ENV.API_URL;
const EMAIL_ADMIN = __ENV.EMAIL_ADMIN;
const PASSWORD_ADMIN = __ENV.PASSWORD_ADMIN;

const fotosHomem = [
  open('Homem 1.jpg', 'b'),
  open('Homem 2.jpg', 'b'),
  open('Homem 3.png', 'b'),
];

const fotosMulher = [
  open('Mulher 1.jpg', 'b'),
  open('Mulher 2.jpg', 'b'),
  open('Mulher 3.jpg', 'b'),
];

const PERFIS = [
  { id: 5, nome: 'Administrador' },
  { id: 6, nome: 'Bibliotecario' },
  { id: 7, nome: 'Leitor' },
  { id: 4, nome: 'Usuario' },
];

const nomesHomem = [
  'Bruno Henrique Costa', 'Carlos Eduardo Souza', 'Eduardo Henrique Pereira', 'Gabriel Rodrigues Martins', 'Igor Felipe Alves',
  'Kevin dos Santos Oliveira', 'Marcos Vinicius Ribeiro', 'Otavio Henrique Gomes', 'Rafael da Silva Cunha', 'Thiago Henrique Barbosa',
  'Anderson Luiz Lima', 'Diego Henrique Ferreira', 'Felipe Augusto Rocha', 'Gustavo Henrique Mendes', 'Henrique da Silva Alves',
  'Joao Victor Oliveira', 'Lucas Henrique Martins', 'Matheus Henrique Santos', 'Nicolas da Silva Pereira', 'Pedro Henrique Ribeiro',
  'Alexandre Gomes da Silva', 'Andre Luiz Barbosa', 'Antonio Carlos Ferreira', 'Caio Henrique dos Santos', 'Daniel Rodrigues Pereira',
  'Davi Lucas Ribeiro', 'Douglas Martins de Oliveira', 'Erick Vinicius Gomes', 'Fernando Henrique Alves', 'Francisco de Assis Souza',
  'George Henrique Lima', 'Guilherme dos Santos Rocha', 'Hugo Leonardo Pereira', 'Israel Gomes da Silva', 'Jean Carlos Martins',
  'Jorge Luiz Ribeiro', 'Jose Henrique da Costa', 'Julio Cesar Alves', 'Leandro Gomes Pereira', 'Leonardo Henrique Martins',
  'Luiz Fernando da Silva', 'Marcelo Augusto Rocha', 'Marcio Henrique Gomes', 'Mateus Felipe Alves', 'Michael Douglas Pereira',
  'Murilo Henrique Santos', 'Nathan Gomes da Silva', 'Paulo Henrique Martins', 'Ricardo Alves Ribeiro', 'Rodrigo Henrique Gomes'
];

const nomesMulher = [
  'Ana Carolina Souza', 'Beatriz Ferreira Lima', 'Camila Rodrigues Santos', 'Daniela Alves Pereira', 'Eduarda Gomes da Silva',
  'Fernanda Costa Ribeiro', 'Gabriela Martins Rocha', 'Helena Barbosa de Souza', 'Isabela Ferreira Gomes', 'Juliana Alves da Silva',
  'Karina Rodrigues Pereira', 'Larissa Gomes Martins', 'Mariana Costa Souza', 'Natalia Alves Ribeiro', 'Patricia Gomes da Silva',
  'Renata Ferreira Rocha', 'Sabrina Martins de Oliveira', 'Tatiane Alves Souza', 'Vanessa Gomes Pereira', 'Yasmin Rodrigues da Silva',
  'Amanda Costa Lima', 'Bruna Alves Rocha', 'Carla Gomes Pereira', 'Debora Martins da Silva', 'Elaine Ferreira Souza',
  'Fabiana Gomes Ribeiro', 'Giovana Alves Pereira', 'Heloisa Martins Souza', 'Ingrid Gomes da Silva', 'Jessica Alves Rocha',
  'Katia Ferreira Lima', 'Leticia Gomes Pereira', 'Monica Alves da Silva', 'Nayara Martins Rocha', 'Priscila Gomes Souza',
  'Raquel Alves Pereira', 'Simone Ferreira da Silva', 'Talita Gomes Rocha', 'Viviane Alves Souza', 'Wesllya Martins Pereira',
  'Aline Barbosa de Souza', 'Bianca Gomes da Costa', 'Claudia Ferreira Alves', 'Denise Martins Pereira', 'Erica Gomes Ribeiro',
  'Flavia Rodrigues da Silva', 'Graziella Alves Rocha', 'Iris Ferreira de Souza', 'Joana Gomes Pereira', 'Luciana Alves da Costa'
];

const logradouros = [
  'Rua Floresta', 'Avenida Brasil', 'Travessa Amazonas', 'Rua Sao Joao',
  'Avenida Independencia', 'Rua Pedro Alvares', 'Travessa Paz', 'Rua Nova',
];

const bairros = [
  'Centro', 'Novo Horizonte', 'Buritizal', 'Universidade',
  'Santa Rita', 'Infraero', 'Congos', 'Jardim Felicidade',
];

function pick(arr, seed) { return arr[seed % arr.length]; }
function gerarCpf(n, ts) { return String(ts + n).slice(-11).padStart(11, '0'); }
function gerarRg(n, ts) { return String(ts + n).slice(-9).padStart(9, '0'); }
function gerarTelefone(n, ts) { const num = String(ts + n).slice(-8); return `(96) 9${num.slice(0, 4)}-${num.slice(4)}`; }
function gerarCep(n) { return `68900-${String(n % 9000 + 1000).padStart(4, '0')}`; }
function gerarData(n) {
  const anos = [1980, 1985, 1990, 1992, 1995, 1998, 2000, 2002, 2003, 2004];
  const mes = String((n % 12) + 1).padStart(2, '0');
  const dia = String((n % 28) + 1).padStart(2, '0');
  return `${anos[n % anos.length]}-${mes}-${dia}`;
}

export function setup() {
  const r = http.post(
    `${API}/auth/login`,
    JSON.stringify({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN }),
    { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' } }
  );
  const ok = check(r, { 'login admin: status 200': (r) => r.status === 200 });
  if (!ok) {
    console.error(`❌ Login admin falhou: ${r.status}`);
    return { token: null };
  }
  const token = JSON.parse(r.body).token;
  console.log(`✅ Login admin OK → token: ${token?.slice(0, 20)}…`);
  return { token };
}

export default function (data) {
  const { token } = data;
  if (!token) {
    taxaSucesso.add(false);
    cadastrosFalha.add(1);
    return;
  }

  const n = (__VU - 1) * 10000 + __ITER;
  const ts = Date.now();
  const uid = `${__VU}_${__ITER}_${ts}`;

  const sexo = __VU % 2 === 0 ? 'F' : 'M';
  const perfil = pick(PERFIS, __VU + __ITER);

  const idxNome = (__VU * 13 + __ITER * 7 + (ts % 97));
  const idxFoto = (__VU * 11 + __ITER * 3 + (ts % 53));

  let nome, fotoBytes, fotoNome, fotoTipo;
  if (sexo === 'M') {
    const fIdx = idxFoto % 3;
    nome = nomesHomem[idxNome % nomesHomem.length];
    fotoBytes = fotosHomem[fIdx];
    fotoNome = fIdx === 2 ? 'Homem 3.png' : `Homem ${fIdx + 1}.jpg`;
    fotoTipo = fIdx === 2 ? 'image/png' : 'image/jpeg';
  } else {
    const fIdx = idxFoto % 3;
    nome = nomesMulher[idxNome % nomesMulher.length];
    fotoBytes = fotosMulher[fIdx];
    fotoNome = `Mulher ${fIdx + 1}.jpg`;
    fotoTipo = 'image/jpeg';
  }

  const email = `teste.v${uid}@teste.com.br`;

  const payload = {
    name: nome,
    email: email,
    cpf: gerarCpf(n, ts),
    perfil_id: String(perfil.id),
    password: __ENV.USER_PASSWORD || 'Test@1234',
    password_confirmation: __ENV.USER_PASSWORD || 'Test@1234',
    rg: gerarRg(n, ts),
    data_nascimento: gerarData(n),
    sexo: sexo,
    telefone: gerarTelefone(n, ts),
    cep: gerarCep(n),
    logradouro: pick(logradouros, n),
    numero: String((n % 999) + 1),
    bairro: pick(bairros, n),
    cidade: 'Macapa',
    estado: 'AP',
  };

  console.log(`\n📋 Cadastrando: ${nome} | Sexo: ${sexo} | Perfil: ${perfil.nome}`);

  const res = http.post(
    `${API}/users`,
    JSON.stringify(payload),
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const ok = check(res, { 'cadastro: status 201': (r) => r.status === 201 });

  if (!ok) {
    cadastrosFalha.add(1);
    taxaSucesso.add(false);
    let msg = '';
    try { msg = JSON.parse(res.body)?.message || res.body?.slice(0, 200); } catch (_) { }
    console.warn(`❌ Cadastro falhou — HTTP ${res.status}: ${msg}`);
    return;
  }

  let userId = '', cpfReal = '', rgReal = '', telReal = '';
  try {
    const body = JSON.parse(res.body);
    userId = body?.data?.id;
    cpfReal = body?.data?.cpf;
    rgReal = body?.data?.rg;
    telReal = body?.data?.telefone;
  } catch (_) { }

  console.log(`✅ Etapa 1 OK — ID: ${userId} | ${nome}`);
  sleep(0.5);

  cadastrosSucesso.add(1);
  taxaSucesso.add(true);

  sleep((__VU % 3) * 0.3);

  const updateForm = {
    _method: 'PUT',
    foto: http.file(fotoBytes, fotoNome, fotoTipo),
    name: nome,
    email: email,
    cpf: cpfReal,
    perfil_id: String(perfil.id),
    password: '',
    password_confirmation: '',
    rg: rgReal,
    data_nascimento: gerarData(n),
    sexo: sexo,
    telefone: telReal,
    cep: gerarCep(n),
    logradouro: pick(logradouros, n),
    numero: String((n % 999) + 1),
    complemento: '',
    bairro: pick(bairros, n),
    cidade: 'Macapa',
    estado: 'AP',
  };

  const resPhoto = http.post(
    `${API}/users/${userId}`,
    updateForm,
    {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  let fotoUrl = '';
  try { fotoUrl = JSON.parse(resPhoto.body)?.data?.foto_url || ''; } catch (_) { }

  if (fotoUrl) {
    console.log(`✅ Etapa 2 OK — ${fotoNome} → usuário ${userId}`);
  } else {
    console.warn(`⚠️  Foto falhou — HTTP ${resPhoto.status}`);
  }

  sleep(0.2);
}

export function handleSummary(data) {
  const t = data.metrics;
  const sucesso = t.cadastros_sucesso?.values?.count ?? 0;
  const falha = t.cadastros_falha?.values?.count ?? 0;

  const linhas = [
    '',
    '══════════════════════════════════════════════════════════════',
    '   👥  CADASTRO DE USUÁRIOS — PROJETO_ESTUDO                 ',
    '══════════════════════════════════════════════════════════════',
    '',
    `  Total solicitado  : ${TOTAL_USUARIOS}`,
    `  Cadastros criados : ${sucesso}`,
    `  Falhas            : ${falha}`,
    '',
    sucesso > 0
      ? '  ✅ Pronto! Para cadastrar mais, altere TOTAL_USUARIOS no script.'
      : '  ❌ Falhou. Verifique o log acima para detalhes.',
    '',
    '══════════════════════════════════════════════════════════════',
    '',
  ].join('\n');

  console.log(linhas);
  return { stdout: linhas };
}
