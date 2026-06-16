# k6-load-testing

Repositório de estudos com testes de carga e stress utilizando o **k6**, ferramenta open source de performance testing.

## Scripts

### Projeto_Estudo_Cadastro.js
Script de teste de carga focado no **cadastro em massa de usuários** via API REST.

**O que faz:**
- Realiza login como administrador e obtém o token de autenticação
- Cadastra múltiplos usuários simultaneamente com dados gerados dinamicamente (nome, CPF, RG, telefone, endereço, data de nascimento)
- Distribui os cadastros entre perfis diferentes (Administrador, Bibliotecário, Leitor, Usuário)
- Alterna sexo entre masculino e feminino para diversificar os dados
- Após o cadastro, faz upload de foto de perfil para cada usuário criado
- Exibe um relatório final com total de cadastros criados e falhas

**Como executar:**
```bash
k6 run \
  -e API_URL=https://sua-api.com/api \
  -e EMAIL_ADMIN=admin@email.com \
  -e PASSWORD_ADMIN=SuaSenha \
  -e USER_PASSWORD=SenhaUsuarios \
  Projeto_Estudo_Cadastro.js
```

---

### Projeto_Estudo_Stress.js
Script de **stress test** focado no fluxo de login e acesso ao dashboard.

**O que faz:**
- Lê a lista de usuários do arquivo `usuarios.csv`
- Simula múltiplos usuários fazendo login simultaneamente
- Após o login, cada usuário acessa o endpoint de perfil autenticado
- Aplica carga escalonada: 100 → 200 → 50 → 200 usuários simultâneos
- Mede tempo de resposta por endpoint separadamente via tags
- Aborta automaticamente se a taxa de sucesso cair abaixo de 90%
- Gera relatório final com percentis de tempo (p50, p95, p99) e resultado aprovado/reprovado

**Como executar:**
```bash
k6 run -e API_URL=https://sua-api.com/api Projeto_Estudo_Stress.js
```

---

## Thresholds

| Métrica | Limite |
|---|---|
| Taxa de sucesso (login) | > 90% |
| Tempo p95 do login | < 3s |
| Tempo p99 do login | < 8s |
| Tempo p95 do dashboard | < 5s |
| Requisições com falha | < 10% |

---

## Pré-requisitos

- [k6](https://k6.io/docs/get-started/installation/) instalado
- API REST disponível e acessível
- Arquivo `usuarios.csv` com emails e senhas dos usuários de teste
