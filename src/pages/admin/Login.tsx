import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, Store } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!email || !password) { setErr('Veuillez remplir tous les champs'); return; }
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin/dashboard');
    } catch (e: any) {
      setErr(e.message || 'Connexion échouée');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-softgray flex flex-col">
      <div className="flex-1 flex items-center justify-center px-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-burgundy mb-4">
              <Store size={28} className="text-white" />
            </div>
            <h1 className="font-serif text-2xl">Laila Shoes</h1>
            <p className="serif-italic text-gold text-sm mt-1">Espace Administration</p>
          </div>

          <form onSubmit={submit} className="bg-white rounded-2xl p-6 shadow-card space-y-4">
            <div>
              <label className="text-xs text-ink/60 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@laila.dz"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy focus:ring-2 focus:ring-burgundy/10 outline-none transition" />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink/60 mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-bordergray bg-white text-sm focus:border-burgundy focus:ring-2 focus:ring-burgundy/10 outline-none transition" />
              </div>
            </div>
            {err && <p className="text-sm text-rose text-center bg-rose/5 rounded-lg py-2">{err}</p>}
            <button type="submit" disabled={loading}
              className="tap w-full h-12 rounded-xl bg-burgundy text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Se connecter <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-ink/50 tap">← Retour à la boutique</Link>
          </div>
          <p className="text-center text-[10px] text-ink/30 mt-4">Démo: admin@laila.dz / admin123</p>
        </motion.div>
      </div>
    </div>
  );
}
