import { useState } from 'react';
import { useAuth } from '../hooks';
import { Mail, Lock, Save, AlertCircle, CheckCircle, UserCircle } from 'lucide-react';

export default function AccountSettings({ user: propUser }) {
  const { user: authUser, updateEmail, updatePassword, updateDisplayName } = useAuth();
  const user = propUser || authUser;
  
  if (!user) return null;
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayNamePending, setDisplayNamePending] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [passwordPending, setPasswordPending] = useState(false);
  const [displayNameSuccess, setDisplayNameSuccess] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [displayNameError, setDisplayNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateDisplayName = async (e) => {
    e.preventDefault();
    if (!newDisplayName) return;
    
    setDisplayNamePending(true);
    setDisplayNameError('');
    setDisplayNameSuccess(false);
    try {
      await updateDisplayName(newDisplayName);
      setDisplayNameSuccess(true);
      setNewDisplayName('');
      setTimeout(() => setDisplayNameSuccess(false), 5000);
    } catch (err) {
      setDisplayNameError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setDisplayNamePending(false);
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || newEmail === user.email) return;
    
    // Prevent multiple rapid submissions
    if (emailPending) return;
    
    setEmailPending(true);
    setEmailError('');
    setEmailSuccess(false);
    try {
      await updateEmail(newEmail);
      setEmailSuccess(true);
      setNewEmail('');
      setTimeout(() => setEmailSuccess(false), 8000);
    } catch (err) {
      console.error('Email update error:', err);
      let errorMessage = err.message || 'Erreur lors de la mise à jour';
      
      // Better error messages for common issues
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = 'Cet email est déjà utilisé par un autre compte';
      } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        errorMessage = 'Trop de tentatives. Veuillez attendre quelques minutes.';
      } else if (err.status === 500 || errorMessage.includes('500')) {
        errorMessage = 'Erreur serveur. Vérifiez que l\'email est valide et réessayez dans quelques minutes.';
      }
      
      setEmailError(errorMessage);
    } finally {
      setEmailPending(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordPending(true);
    setPasswordError('');
    setPasswordSuccess(false);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 5000);
    } catch (err) {
      setPasswordError(err.message || 'Erreur lors de la mise à jour');
    } finally {
      setPasswordPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-6">
      {/* Changer le nom d'affichage */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <UserCircle className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Modifier le nom d'affichage</h3>
            <p className="text-sm text-gray-500">Nom actuel : {user.user_metadata?.display_name || 'Non défini'}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateDisplayName} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau nom d'affichage
            </label>
            <input
              type="text"
              placeholder="Votre nom"
              value={newDisplayName}
              onChange={e => setNewDisplayName(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {displayNameError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{displayNameError}</p>
            </div>
          )}

          {displayNameSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">Nom d'affichage mis à jour !</p>
            </div>
          )}

          <button
            type="submit"
            disabled={displayNamePending || !newDisplayName}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {displayNamePending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Mettre à jour le nom
              </>
            )}
          </button>
        </form>
      </div>

      {/* Changer l'email */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Mail className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Modifier l'adresse email</h3>
            <p className="text-sm text-gray-500">Email actuel : {user.email}</p>
          </div>
        </div>

        <form onSubmit={handleUpdateEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouvelle adresse email
            </label>
            <input
              type="email"
              placeholder="nouvelle@email.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {emailError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{emailError}</p>
            </div>
          )}

          {emailSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <div className="text-sm text-green-700">
                <p className="font-semibold">Email de confirmation envoyé !</p>
                <p className="text-xs mt-1">Vérifiez votre nouvelle boîte email pour confirmer le changement.</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={emailPending || !newEmail || newEmail === user.email}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {emailPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Mettre à jour l'email
              </>
            )}
          </button>
        </form>
      </div>

      {/* Changer le mot de passe */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Lock className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900">Modifier le mot de passe</h3>
            <p className="text-sm text-gray-500">Sécurisez votre compte avec un nouveau mot de passe</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              minLength={6}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              minLength={6}
              className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {passwordError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">Mot de passe mis à jour avec succès !</p>
            </div>
          )}

          <button
            type="submit"
            disabled={passwordPending || !newPassword || !confirmPassword}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {passwordPending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Mettre à jour le mot de passe
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
