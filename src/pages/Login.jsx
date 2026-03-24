import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login, register, loginWithGoogle, isAuthenticated, isLoadingAuth } =
    useAuth();

  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6;
  }, [email, password]);

  React.useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "register") {
        await register(email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate("/", { replace: true });
    } catch (err) {
      const msg =
        err?.code === "auth/invalid-credential"
          ? "E-mail ou senha inválidos."
          : err?.code === "auth/email-already-in-use"
            ? "Este e-mail já está cadastrado."
            : err?.code === "auth/weak-password"
              ? "Senha fraca. Use pelo menos 6 caracteres."
              : err?.message || "Falha ao autenticar.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      await loginWithGoogle();
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.message || "Falha ao autenticar com Google.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-display font-bold text-xl">
              L
            </span>
          </div>
        </div>

        <Card className="p-6 border border-border">
          <div className="mb-5">
            <h1 className="text-2xl font-semibold text-foreground font-display">
              {mode === "register" ? "Criar conta" : "Entrar"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acesse sua área para gerenciar pacientes e atendimentos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo 6 caracteres"
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                required
              />
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit || busy}
            >
              {busy
                ? "Aguarde..."
                : mode === "register"
                  ? "Cadastrar"
                  : "Entrar"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            Entrar com Google
          </Button>

          <div className="mt-5 text-sm text-muted-foreground">
            {mode === "register" ? (
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setMode("login")}
              >
                Já tem conta? Entrar
              </button>
            ) : (
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => setMode("register")}
              >
                Não tem conta? Criar agora
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

