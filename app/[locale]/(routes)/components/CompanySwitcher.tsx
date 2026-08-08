"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
import { getCompaniesForSwitcher, switchCompany } from "@/actions/company/switch-company";
import { toast } from "sonner";

interface CompanySwitcherProps {
  currentCompanyId?: string | null;
  currentCompanyName?: string | null;
}

export function CompanySwitcher({
  currentCompanyId,
  currentCompanyName,
}: CompanySwitcherProps) {
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCompaniesForSwitcher()
      .then(setCompanies)
      .catch(() => {});
  }, []);

  if (companies.length <= 1) {
    if (!currentCompanyName) return null;
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
        <Building2 className="h-4 w-4" />
        <span className="font-medium text-foreground">{currentCompanyName}</span>
      </div>
    );
  }

  const handleChange = async (value: string) => {
    setLoading(true);
    try {
      await switchCompany(value);
      toast.success("Company switched");
      window.location.reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to switch company");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Select
      value={currentCompanyId ?? undefined}
      onValueChange={handleChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[200px] h-9 border-border/60">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select company" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
