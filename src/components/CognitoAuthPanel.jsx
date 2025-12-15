import { User, LogOut } from 'lucide-react';
import { useAuth } from 'react-oidc-context';

export default function CognitoAuthPanel() {
  const auth = useAuth();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (auth.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
        <p className="text-red-700">Authentication error: {auth.error.message}</p>
      </div>
    );
  }

  if (auth.isAuthenticated) {
    const userEmail = auth.user?.profile?.email || 'User';
    const userName = auth.user?.profile?.name || userEmail.split('@')[0];

    return (
      <div className="space-y-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-green-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-xs text-green-700 truncate">{userEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => auth.removeUser()}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
        {/* Hero header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 px-8 py-10 text-center">
          <div className="mx-auto h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Welcome!</h2>
          <p className="text-indigo-100">Sign in with AWS Cognito</p>
        </div>

        {/* Login form */}
        <div className="px-8 py-8">
          <button
            onClick={() => auth.signinRedirect()}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
