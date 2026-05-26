import { SignIn } from '@clerk/nextjs';
import Logo from '@/components/Logo';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={80} className="text-white mb-4" />
        <h1 className="font-black text-2xl text-white tracking-tight">Welcome back</h1>
        <p className="text-[#444] text-sm mt-1">Sign in to your SwipeFit account</p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'bg-[#111] border border-[#1E1E1E] shadow-2xl rounded-2xl',
            headerTitle: 'text-white font-black text-lg',
            headerSubtitle: 'text-[#555] text-sm',
            socialButtonsBlockButton: 'border border-[#222] bg-[#181818] text-white hover:bg-[#222] rounded-xl',
            socialButtonsBlockButtonText: 'text-white font-medium text-sm',
            dividerLine: 'bg-[#1E1E1E]',
            dividerText: 'text-[#444] text-xs',
            formFieldLabel: 'text-[#888] text-xs font-bold uppercase tracking-wider',
            formFieldInput: 'bg-[#181818] border-[#222] text-white rounded-xl focus:border-[#E63946] focus:ring-0 text-sm',
            formButtonPrimary: 'bg-[#E63946] hover:bg-[#cc3040] text-white font-black rounded-xl uppercase tracking-wider text-sm',
            footerActionLink: 'text-[#E63946] font-semibold hover:text-[#ff5c68]',
            footerActionText: 'text-[#444]',
            identityPreviewText: 'text-white',
            identityPreviewEditButton: 'text-[#E63946]',
            alertText: 'text-[#E63946] text-sm',
            otpCodeFieldInput: 'bg-[#181818] border-[#222] text-white rounded-xl',
          },
          variables: {
            colorPrimary: '#E63946',
            colorBackground: '#111111',
            colorText: '#FFFFFF',
            colorTextSecondary: '#555555',
            colorInputBackground: '#181818',
            colorInputText: '#FFFFFF',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
        }}
      />
    </div>
  );
}
