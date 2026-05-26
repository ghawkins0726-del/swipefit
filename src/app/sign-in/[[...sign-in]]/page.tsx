import { SignIn } from '@clerk/nextjs';
import { Flame } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Flame size={22} className="text-[#E63946]" strokeWidth={2.5} />
          <span className="font-black text-2xl text-white tracking-tight">SwipeFit</span>
        </div>
        <p className="text-[#5A5A5A] text-sm">Swipe. Like. Shop.</p>
      </div>

      <SignIn
        appearance={{
          elements: {
            rootBox: 'w-full max-w-sm',
            card: 'bg-[#141414] border border-[#222] shadow-2xl rounded-2xl',
            headerTitle: 'text-white font-black text-xl',
            headerSubtitle: 'text-[#5A5A5A] text-sm',
            socialButtonsBlockButton: 'border border-[#2A2A2A] bg-[#1A1A1A] text-white hover:bg-[#222] rounded-xl',
            socialButtonsBlockButtonText: 'text-white font-medium',
            dividerLine: 'bg-[#222]',
            dividerText: 'text-[#5A5A5A] text-xs',
            formFieldLabel: 'text-[#AAAAAA] text-xs font-bold uppercase tracking-wider',
            formFieldInput: 'bg-[#1A1A1A] border-[#2A2A2A] text-white rounded-xl focus:border-[#E63946] focus:ring-0',
            formButtonPrimary: 'bg-[#E63946] hover:bg-[#cc3040] text-white font-bold rounded-xl uppercase tracking-wider text-sm',
            footerActionLink: 'text-[#E63946] font-semibold hover:text-[#ff5c68]',
            footerActionText: 'text-[#5A5A5A]',
            identityPreviewText: 'text-white',
            identityPreviewEditButton: 'text-[#E63946]',
            formFieldInputShowPasswordButton: 'text-[#5A5A5A]',
            alertText: 'text-[#E63946] text-sm',
            otpCodeFieldInput: 'bg-[#1A1A1A] border-[#2A2A2A] text-white rounded-xl',
          },
          variables: {
            colorPrimary: '#E63946',
            colorBackground: '#141414',
            colorText: '#FFFFFF',
            colorTextSecondary: '#5A5A5A',
            colorInputBackground: '#1A1A1A',
            colorInputText: '#FFFFFF',
            borderRadius: '12px',
            fontFamily: 'inherit',
          },
        }}
      />

      <p className="mt-6 text-[#3A3A3A] text-xs text-center">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="text-[#E63946] font-semibold">Sign up free</Link>
      </p>
    </div>
  );
}
