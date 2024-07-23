document.addEventListener('DOMContentLoaded', () => {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentos')) || [];
    const clienteLogado = localStorage.getItem('clienteLogado');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // Redirecionar usuários não-admin da página de gerenciamento
    if (window.location.pathname.includes('gerenciamento.html') && !isAdmin) {
        alert('Você precisa ser um administrador para acessar essa página.');
        window.location.href = 'login.html';
        return; // Parar a execução se não for administrador
    }

    // Função para verificar se duas datas estão na mesma semana
    function isSameWeek(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        const startOfWeek1 = new Date(d1.setDate(d1.getDate() - d1.getDay()));
        const startOfWeek2 = new Date(d2.setDate(d2.getDate() - d2.getDay()));

        return startOfWeek1.getTime() === startOfWeek2.getTime();
    }

    // Função para remover agendamentos passados
    function removerAgendamentosPassados() {
        const now = new Date();
        return agendamentos.filter(agendamento => {
            const agendamentoDate = new Date(`${agendamento.data}T${agendamento.horario}`);
            return (agendamentoDate - now) > (30 * 60 * 1000); // Manter se não passou mais de 30 minutos do horário
        });
    }

    // Função para atualizar o status de agendamentos
    function atualizarStatusAgendamentos() {
        const now = new Date();
        agendamentos.forEach(agendamento => {
            const agendamentoDate = new Date(`${agendamento.data}T${agendamento.horario}`);
            if ((now - agendamentoDate) > (10 * 60 * 1000) && agendamento.status === 'agendado') {
                agendamento.status = 'finalizado'; // Atualizar status para finalizado se passou mais de 10 minutos do horário
            }
        });
        localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
    }

    // Atualizar status dos agendamentos ao carregar a página
    atualizarStatusAgendamentos();

    // Mostrar links de login/logout corretamente
    const loginLink = document.getElementById('loginLink');
    const logoutLink = document.getElementById('logoutLink');

    if (loginLink && logoutLink) {
        if (clienteLogado) {
            loginLink.style.display = 'none';
            logoutLink.style.display = 'inline';
        } else {
            loginLink.style.display = 'inline';
            logoutLink.style.display = 'none';
        }

        logoutLink.addEventListener('click', () => {
            localStorage.removeItem('clienteLogado');
            localStorage.removeItem('isAdmin');
            window.location.href = 'index.html';
        });
    }

    // Exibir Histórico de Agendamentos
    if (document.getElementById('historicoTable')) {
        const tbody = document.querySelector('#historicoTable tbody');
        agendamentos.forEach((agendamento, index) => {
            const row = document.createElement('tr');
            const agendamentoDate = new Date(`${agendamento.data}T${agendamento.horario}`);
            const now = new Date();
            if (clienteLogado && (isAdmin || agendamento.cliente === clienteLogado)) {
                row.innerHTML = `
                    <td>${agendamento.cliente}</td>
                    <td>${agendamento.servico}</td>
                    <td>${agendamento.data}</td>
                    <td>${agendamento.horario}</td>
                    <td>${agendamento.status}</td>
                    <td>
                        ${agendamento.status === 'agendado' && agendamentoDate > now ? `<a href="alterar.html?id=${index}">Alterar</a>` : ''}
                        ${agendamento.status === 'agendado' && (agendamentoDate - now) >= (30 * 60 * 1000) ? `<button onclick="cancelarAgendamento(${index})">Cancelar</button>` : ''}
                    </td>
                `;
                tbody.appendChild(row);
            }
        });
    }

    // Exibir Calendário na página de histórico
    if (document.getElementById('calendar')) {
        const calendarEl = document.getElementById('calendar');
        const eventosAtuais = removerAgendamentosPassados().map(agendamento => ({
            title: 'Ocupado',
            start: `${agendamento.data}T${agendamento.horario}`
        }));

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            events: eventosAtuais,
            eventColor: '#FF0000', // Cor para eventos ocupados
            eventTextColor: '#FFFFFF' // Cor do texto dos eventos
        });

        calendar.render();
    }

    // Agendamento de Serviços
    if (document.getElementById('agendarForm')) {
        document.getElementById('agendarForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const cliente = document.getElementById('cliente').value;
            const servico = document.getElementById('servico').value;
            const data = document.getElementById('data').value;
            const horario = document.getElementById('horario').value;

            // Verificar se a data e horário são válidos e no futuro
            const now = new Date();
            const agendamentoDate = new Date(`${data}T${horario}`);

            if (agendamentoDate <= now) {
                alert('Não é possível agendar para uma data e horário passados.');
                return;
            }

            // Verificar se a data e horário estão dentro do horário de funcionamento
            const diaSemana = agendamentoDate.getDay();
            const hora = agendamentoDate.getHours();
            if (diaSemana === 0 || diaSemana === 6 || hora < 7 || hora >= 20) {
                alert('Os agendamentos só podem ser feitos de segunda a sexta, das 7h às 20h.');
                return;
            }

            // Verificar se já existe um agendamento no mesmo horário
            const horarioExistente = agendamentos.find(agendamento => agendamento.data === data && agendamento.horario === horario);
            if (horarioExistente) {
                alert('Já existe um agendamento para este horário.');
                return;
            }

            // Verificar se o cliente já tem um agendamento na mesma semana
            const mesmaSemana = agendamentos.find(agendamento => agendamento.cliente === cliente && isSameWeek(agendamento.data, data));
            if (mesmaSemana) {
                const confirma = confirm('Você já tem um agendamento nesta semana. Gostaria de agendar todos os serviços no mesmo horário?');
                if (confirma) {
                    agendamentos.push({ cliente, servico, data: mesmaSemana.data, horario: mesmaSemana.horario, status: 'agendado' });
                } else {
                    agendamentos.push({ cliente, servico, data, horario, status: 'agendado' });
                }
            } else {
                agendamentos.push({ cliente, servico, data, horario, status: 'agendado' });
            }

            localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
            alert('Agendamento realizado com sucesso!');
            window.location.href = 'index.html';
        });
    }

    // Função para cancelar agendamentos
    window.cancelarAgendamento = function(index) {
        const now = new Date();
        const agendamentoDate = new Date(`${agendamentos[index].data}T${agendamentos[index].horario}`);
        if ((agendamentoDate - now) >= (30 * 60 * 1000)) { // Verificar se falta pelo menos 30 minutos
            agendamentos.splice(index, 1);
            localStorage.setItem('agendamentos', JSON.stringify(agendamentos));
            alert('Agendamento cancelado com sucesso!');
            window.location.reload();
        } else {
            alert('Os agendamentos só podem ser cancelados com no mínimo 30 minutos de antecedência.');
        }
    }

    // Função para criar uma nova conta
    if (document.getElementById('signupForm')) {
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const novoCliente = document.getElementById('novoCliente').value;
            const novaSenha = document.getElementById('novaSenha').value;
            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

            const usuarioExistente = usuarios.find(usuario => usuario.nome === novoCliente);
            if (usuarioExistente) {
                alert('Já existe uma conta com esse nome.');
                return;
            }

            usuarios.push({ nome: novoCliente, senha: novaSenha });
            localStorage.setItem('usuarios', JSON.stringify(usuarios));
            alert('Conta criada com sucesso!');
            window.location.href = 'login.html';
        });
    }

    // Função para realizar login
    if (document.getElementById('loginForm')) {
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const cliente = document.getElementById('clienteLogin').value;
            const senha = document.getElementById('senhaLogin').value;
            const usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

            if (cliente === 'admin' && senha === 'admin123') {
                localStorage.setItem('clienteLogado', cliente);
                localStorage.setItem('isAdmin', 'true');
                alert(`Bem-vindo, ${cliente}!`);
                window.location.href = 'index.html';
            } else {
                const usuarioValido = usuarios.find(usuario => usuario.nome === cliente && usuario.senha === senha);
                if (usuarioValido) {
                    localStorage.setItem('clienteLogado', cliente);
                    localStorage.setItem('isAdmin', 'false');
                    alert(`Bem-vindo, ${cliente}!`);
                    window.location.href = 'index.html';
                } else {
                    alert('Nome ou senha incorretos.');
                }
            }
        });
    }
});
