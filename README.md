# Lumie - Gestão de Atendimentos (Autismo)

Aplicação web completa para:
- Cadastro de pacientes (nome, valor por hora, observações)
- Registro de atendimentos com **duração manual** ou **timer**
- Cálculo automático de valor (`valor_total = valor_por_hora * (horas + minutos/60)`)
- Relatórios com filtros por período e por paciente
- Exportação de relatório em **CSV** e **PDF simples**

## Stack
- Frontend: HTML/CSS/JavaScript (SPA simples, mobile-first)
- Backend: Firebase (Auth anônima + Firestore)
- Banco de dados: Firestore

## Pré-requisitos
- Um projeto no **Firebase**
- Firestore habilitado
- Um servidor local simples para servir os arquivos (recomendado para funcionar com `type="module"`)

## Como rodar localmente
1. Abra a pasta do projeto no seu computador.
2. Configure o Firebase:
   - Acesse o Firebase Console
   - Crie um projeto
   - Ative o **Firestore**
   - Em **Authentication**, ative o provedor **Anonymous**
   - Vá em **Configurações do projeto** -> copie o objeto `firebaseConfig`
   - Edite o arquivo `firebaseConfig.js` e cole os valores
3. Aplique as regras de segurança:
   - Abra `firestore.rules` e use como regras do Firestore
4. Sirva a aplicação:
   - Opção 1 (Python): `python -m http.server 5173`
   - Opção 2 (qualquer server estático): use sua ferramenta preferida
5. Acesse no navegador:
   - `http://localhost:5173/` (ou a porta que você escolheu)

## Estrutura do banco (Firestore)
- `users/{uid}/patients/{patientId}`
  - `name` (string)
  - `hourlyRateCents` (number inteiro; R$/hora * 100)
  - `notes` (string)
  - `createdAt` / `updatedAt` (timestamps)
- `users/{uid}/appointments/{appointmentId}`
  - `patientId` (string)
  - `patientNameSnapshot` (string)
  - `date` (Timestamp)
  - `durationMinutes` (number inteiro)
  - `hourlyRateCentsSnapshot` (number inteiro)
  - `totalValueCents` (number inteiro)
  - `createdAt` / `updatedAt` (timestamps)

## Observações importantes
- O valor total é calculado no momento de salvar o atendimento e também é recalculado quando você edita (usando o valor atual do paciente).
- Excluir um paciente também remove os atendimentos relacionados (feito no front por consistência).

## Dicas de uso
- Em **Atendimentos**, escolha:
  - **Digitar duração**: informe horas e minutos
  - **Usar contador**: clique em **Iniciar** e depois **Finalizar**
- Em **Relatórios**, selecione:
  - Semana / Mês / Personalizado
  - Paciente específico ou `Todos`
- Use **Exportar CSV** para levar para planilha.

