import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Plus, Minus, Search, Settings, 
  LogOut, Briefcase, GraduationCap, Calendar, Filter,
  Bell, User, ChevronDown, Activity, DollarSign, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, Area, AreaChart
} from 'recharts';
import './App.css';

const API_URL = 'http://localhost:3000/api';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'];

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  
  // Login State
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authForm, setAuthForm] = useState({ name: '', cpf: '', password: '' });
  const [authError, setAuthError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('income');
  const [formData, setFormData] = useState({
    description: '', value: '', category: 'Licitações', date: new Date().toISOString().split('T')[0], status: 'pago'
  });

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token]);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || t.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'dashboard' || 
                       (activeTab === 'incomes' && t.type === 'income') || 
                       (activeTab === 'expenses' && t.type === 'expense');
    return matchesSearch && matchesTab;
  });

  // Derived Metrics
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.value, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.value, 0);
  const balance = totalIncome - totalExpense;

  // --- Dynamic Chart Data Calculation ---
  // Area Chart (Fluxo de Caixa - Agrupado por Data)
  const calculateFlowData = () => {
    const flowMap = {};
    transactions.forEach(t => {
      // Formata a data para ficar bonitinha, ex: "15 Ago"
      const dateObj = new Date(t.date);
      const day = String(dateObj.getDate() + 1).padStart(2, '0'); // +1 pq Date em JS converte pro dia anterior se for UTC meia noite
      const month = dateObj.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
      const dateLabel = `${day} ${month}`;
      
      if (!flowMap[dateLabel]) {
        flowMap[dateLabel] = { name: dateLabel, entradas: 0, saidas: 0, rawDate: dateObj.getTime() };
      }
      
      if (t.type === 'income') flowMap[dateLabel].entradas += t.value;
      if (t.type === 'expense') flowMap[dateLabel].saidas += t.value;
    });

    // Ordena pelas datas cronologicamente
    return Object.values(flowMap).sort((a, b) => a.rawDate - b.rawDate);
  };
  const flowData = calculateFlowData();

  // Pie Chart (Receitas por Categoria)
  const calculatePieData = () => {
    const categoryMap = {};
    transactions.filter(t => t.type === 'income').forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = 0;
      }
      categoryMap[t.category] += t.value;
    });
    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };
  const pieData = calculatePieData();
  // ----------------------------------------

  const handleNewTransaction = (type) => {
    setModalType(type);
    setFormData({
      description: '', value: '', category: type === 'income' ? 'Licitações' : 'Administrativo', 
      date: new Date().toISOString().split('T')[0], status: 'pago'
    });
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.value) return;

    try {
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: modalType,
          value: formData.value,
          description: formData.description,
          category: formData.category,
          date: formData.date,
          status: formData.status
        })
      });

      if (res.ok) {
        fetchTransactions(); // recarrega a lista
        setIsModalOpen(false);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? '/login' : '/register';
    
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();

      if (res.ok) {
        if (authMode === 'login') {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setToken(data.token);
          setUser(data.user);
        } else {
          setAuthMode('login'); // Redirect to login after register
          setAuthForm({ ...authForm, password: '' });
          alert('Conta criada com sucesso! Faça login para continuar.');
        }
      } else {
        setAuthError(data.error || 'Erro de autenticação');
      }
    } catch (err) {
      setAuthError('Falha ao conectar no servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setTransactions([]);
  };

  if (!token) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', width: '400px', maxWidth: '90%' }}>
          <div className="brand animate-fade-up" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="brand-icon">
              <Activity color="white" size={22} />
            </div>
            <h2 style={{ color: 'white', margin: 0 }}>FinanceX</h2>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button className={`btn-primary ${authMode === 'login' ? '' : 'badge-outline'}`} 
                    style={{ flex: 1, background: authMode === 'login' ? 'var(--primary)' : 'transparent', boxShadow: 'none' }}
                    onClick={() => setAuthMode('login')}>Login</button>
            <button className={`btn-primary ${authMode === 'register' ? '' : 'badge-outline'}`} 
                    style={{ flex: 1, background: authMode === 'register' ? 'var(--primary)' : 'transparent', boxShadow: 'none' }}
                    onClick={() => setAuthMode('register')}>Registrar</button>
          </div>

          <form onSubmit={handleAuthSubmit} className="animate-fade-up">
            {authError && <div style={{ color: 'var(--danger)', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{authError}</div>}
            
            {authMode === 'register' && (
              <div className="input-group">
                <label>Nome Completo</label>
                <input type="text" className="input-field" placeholder="Seu nome" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} required />
              </div>
            )}
            
            <div className="input-group">
              <label>CPF</label>
              <input type="text" className="input-field" placeholder="000.000.000-00" value={authForm.cpf} onChange={e => setAuthForm({...authForm, cpf: e.target.value})} required />
            </div>
            
            <div className="input-group">
              <label>Senha</label>
              <input type="password" className="input-field" placeholder="••••••••" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} required />
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              {authMode === 'login' ? 'Entrar no Sistema' : 'Criar Conta'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand animate-fade-up">
          <div className="brand-icon">
            <Activity color="white" size={22} />
          </div>
          <h2>FinanceX</h2>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item animate-fade-up delay-1 ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <Briefcase size={20} /> Dashboard BI
          </button>
          <button className={`nav-item animate-fade-up delay-2 ${activeTab === 'incomes' ? 'active' : ''}`} onClick={() => setActiveTab('incomes')}>
            <TrendingUp size={20} /> Receitas
          </button>
          <button className={`nav-item animate-fade-up delay-3 ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => setActiveTab('expenses')}>
            <TrendingDown size={20} /> Despesas
          </button>
        </nav>

        <button className="nav-item logout animate-fade-up delay-3" onClick={handleLogout}>
          <LogOut size={20} /> Sair do Sistema
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {/* TOP NAVIGATION */}
        <header className="top-nav">
          <div className="search-container">
            <Search size={18} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="Buscar transações, categorias..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="user-actions">
            <button className="icon-btn">
              <Bell size={20} />
              <span className="badge-dot"></span>
            </button>
            <div className="avatar" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--glass-bg)', padding: '5px 15px', borderRadius: '30px', border: '1px solid var(--glass-border)' }}>
              <span style={{color: 'white', fontSize: '0.9rem'}}>{user?.name?.split(' ')[0] || 'Usuário'}</span>
              <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'}}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-wrapper animate-fade-up delay-1">
            <div className="header-title">
              <h1>Visão Estratégica</h1>
              <p>Acompanhe os indicadores de performance da sua empresa.</p>
            </div>

            {/* METRICS */}
            <div className="metrics-grid">
              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Saldo Disponível</span>
                  <DollarSign size={20} className="metric-icon" color="var(--primary)" />
                </div>
                <div className="metric-value">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="metric-trend trend-up"><TrendingUp size={16} /> +12% esse mês</div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Total de Receitas</span>
                  <TrendingUp size={20} className="metric-icon" color="var(--success)" />
                </div>
                <div className="metric-value" style={{color: 'var(--success)'}}>R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="metric-trend trend-up"><TrendingUp size={16} /> +5.2% vs mês passado</div>
              </div>

              <div className="metric-card glass-panel">
                <div className="metric-header">
                  <span className="metric-title">Total de Despesas</span>
                  <TrendingDown size={20} className="metric-icon" color="var(--danger)" />
                </div>
                <div className="metric-value" style={{color: 'var(--text-primary)'}}>R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                <div className="metric-trend trend-down"><TrendingDown size={16} /> -2.1% redução</div>
              </div>
            </div>

            {/* CHARTS */}
            <div className="charts-grid">
              <div className="chart-container glass-panel">
                <div className="chart-header">
                  <h3>Fluxo de Caixa (Últimos 7 dias)</h3>
                  <select className="chart-filter"><option>Últimos 7 dias</option><option>Últimos 30 dias</option></select>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <AreaChart data={flowData.length > 0 ? flowData : [{ name: 'Sem Dados', entradas: 0, saidas: 0 }]}>
                      <defs>
                        <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--text-muted)" axisLine={false} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val}`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--glass-border)', borderRadius: '12px' }} />
                      <Area type="monotone" dataKey="entradas" stroke="#10b981" fillOpacity={1} fill="url(#colorEntradas)" strokeWidth={3} />
                      <Area type="monotone" dataKey="saidas" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSaidas)" strokeWidth={3} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="chart-container glass-panel">
                <div className="chart-header">
                  <h3>Receitas por Setor</h3>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={pieData.length > 0 ? pieData : [{ name: 'Sem Dados', value: 1 }]}
                        cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none"
                      >
                        {pieData.length > 0 ? (
                          pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
                        ) : (
                          <Cell fill="#333" /> // Cor apagada caso não tenha dados
                        )}
                      </Pie>
                      <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--glass-border)', borderRadius: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TRANSACTIONS TABLE VIEW */}
        <div className="dashboard-wrapper" style={{ paddingTop: activeTab === 'dashboard' ? '0' : '2.5rem' }}>
          <div className="table-section glass-panel animate-fade-up delay-2">
            <div className="table-header">
              <h3>Histórico de Transações</h3>
              <div style={{display: 'flex', gap: '10px'}}>
                {activeTab !== 'incomes' && (
                  <button className="btn-primary" onClick={() => handleNewTransaction('expense')} style={{background: 'linear-gradient(135deg, var(--danger), #be123c)'}}>
                    <Minus size={18} /> Lançar Despesa
                  </button>
                )}
                {activeTab !== 'expenses' && (
                  <button className="btn-primary" onClick={() => handleNewTransaction('income')} style={{background: 'linear-gradient(135deg, var(--success), #047857)'}}>
                    <Plus size={18} /> Lançar Receita
                  </button>
                )}
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição da Operação</th>
                  <th>Categoria</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th style={{textAlign: 'right'}}>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td className="tx-desc">{t.description}</td>
                      <td>
                        <span className="badge badge-outline">
                          {t.category === 'Licitações' ? <Briefcase size={12} /> : 
                           t.category === 'Trabalhos Acadêmicos' ? <GraduationCap size={12} /> : null}
                          {t.category}
                        </span>
                      </td>
                      <td style={{color: 'var(--text-secondary)'}}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <span className={`badge ${t.status === 'pago' ? 'badge-success' : 'badge-warning'}`}>
                          {t.status === 'pago' ? 'Confirmado' : 'Pendente'}
                        </span>
                      </td>
                      <td className={`tx-amount ${t.type === 'income' ? 'tx-income' : 'tx-expense'}`}>
                        {t.type === 'income' ? '+' : '-'} R$ {t.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>Nenhuma transação encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Lançar {modalType === 'income' ? 'Receita' : 'Despesa'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSaveTransaction}>
              <div className="modal-body">
                <div className="input-group">
                  <label>Descrição</label>
                  <input type="text" className="input-field" placeholder="Ex: Contrato de Prestação de Serviço" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Valor (R$)</label>
                  <input type="number" step="0.01" className="input-field" placeholder="0.00" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Categoria</label>
                  <select className="input-field" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Licitações</option><option>Trabalhos Acadêmicos</option>
                    <option>Administrativo</option><option>Infraestrutura</option>
                  </select>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                  <div className="input-group" style={{flex: 1}}>
                    <label>Data</label>
                    <input type="date" className="input-field" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                  </div>
                  <div className="input-group" style={{flex: 1}}>
                    <label>Status</label>
                    <select className="input-field" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                      <option value="pago">Confirmado</option><option value="pendente">Pendente</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-primary" style={{background: 'transparent', border: '1px solid var(--glass-border)', boxShadow: 'none'}} onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" style={modalType === 'income' ? {background: 'var(--success)'} : {background: 'var(--danger)'}}>Salvar Lançamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
