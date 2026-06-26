'use client';
import LoginPage from '@/components/ui/gaming-login';

export default function DemoPage() {
  const handleLogin = (email: string, password: string, remember: boolean) => {
    console.log('Login attempt:', { email, password, remember });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 py-12 select-none">
      <LoginPage.VideoBackground videoUrl="https://videos.pexels.com/video-files/8128311/8128311-uhd_2560_1440_25fps.mp4" />

      <div className="relative z-20 w-full max-w-md">
        <LoginPage.LoginForm onSubmit={handleLogin} />
      </div>

      <footer className="absolute bottom-4 left-0 right-0 text-center text-white/60 text-sm z-20">
        © 2025 NexusGate. All rights reserved.
      </footer>
    </div>
  );
}
