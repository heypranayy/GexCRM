"use client";

import React, { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LockIcon, MailIcon } from "lucide-react";

export function LoginComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    fetch("/api/dev/ensure-admin")
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) setSetupDone(true);
      })
      .catch(() => {});
  }, []);

  const signInWithPassword = async () => {
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/",
      });
      if (error) {
        toast.error(error.message || "Invalid email or password.");
        return;
      }
      toast.success("Welcome to Gexart CRM");
      window.location.href = "/";
    } catch {
      toast.error("Sign in failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg my-5 w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Enter your Gexart CRM credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <MailIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="admin@gexart.com"
              className="pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <LockIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="Your password"
              className="pl-9"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === "Enter" && signInWithPassword()}
            />
          </div>
        </div>
        <Button onClick={signInWithPassword} disabled={isLoading || !email || !password}>
          Sign in
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          {setupDone
            ? "Ready: admin@gexart.com / Gexart@123456"
            : "Use admin@gexart.com / Gexart@123456 (run pnpm dev after DB is up)"}
        </p>
      </CardContent>
    </Card>
  );
}
