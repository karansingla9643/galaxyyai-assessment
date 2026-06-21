import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-white to-white pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="Logo" width={24} height={24} />
            <span className="text-xl font-bold text-gray-900">Magica</span>
          </div>
          <p className="text-sm text-gray-400">Build AI workflows, visually.</p>
        </div>

        <SignIn
          forceRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-xl border border-gray-200 rounded-2xl",
              headerTitle: "text-gray-900 font-bold",
              headerSubtitle: "text-gray-500",
              formFieldLabel: "text-gray-700 font-medium",
              formFieldInput: "border-gray-200 focus:border-indigo-400 focus:ring-indigo-500/10 rounded-lg",
              formButtonPrimary: "bg-gray-900 hover:bg-gray-700 font-semibold rounded-lg",
              footerActionLink: "text-indigo-600 hover:text-indigo-700 font-medium",
              dividerLine: "bg-gray-200",
              dividerText: "text-gray-400",
              socialButtonsBlockButton: "border-gray-200 hover:bg-gray-50 rounded-lg",
              socialButtonsBlockButtonText: "text-gray-700 font-medium",
            },
          }}
        />
      </div>
    </div>
  );
}
