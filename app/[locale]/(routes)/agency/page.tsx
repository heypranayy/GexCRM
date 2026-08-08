"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Search, BarChart3, Palette, Sparkles, Plus, Check } from "lucide-react";
import { toast } from "sonner";

export default function AgencyDashboard() {
  const [crmLeads, setCrmLeads] = useState([
    { id: "1", name: "Alpha Tech Solutions", value: "$12,000", stage: "Lead" },
    { id: "2", name: "Delta Global Brands", value: "$25,000", stage: "Proposal" },
    { id: "3", name: "Nouveau Creative Group", value: "$8,500", stage: "Negotiation" },
  ]);

  const [seoKeywords, setSeoKeywords] = useState([
    { keyword: "agency software solutions", rank: 3, change: "+2" },
    { keyword: "enterprise crm erp", rank: 1, change: "0" },
    { keyword: "automated sales pipeline", rank: 8, change: "-1" },
  ]);

  const [ppcCampaigns, setPpcCampaigns] = useState([
    { name: "Google Search - High Intent", budget: "$150/day", roas: "4.2x", ctr: "5.8%" },
    { name: "Meta Retargeting - Video Feed", budget: "$80/day", roas: "3.9x", ctr: "8.1%" },
  ]);

  const [creativeRequests, setCreativeRequests] = useState([
    { id: "1", title: "Landing Page UI mockup", type: "Design", status: "In Revision" },
    { id: "2", title: "Vercel Product Intro Reel", type: "Video", status: "Approved" },
    { id: "3", title: "Instagram Ads carousel assets", type: "Graphics", status: "Pending" },
  ]);

  const handleAddLead = () => {
    const name = prompt("Enter lead company name:");
    if (!name) return;
    const value = prompt("Enter estimate deal value:");
    setCrmLeads((prev) => [
      ...prev,
      { id: Date.now().toString(), name, value: value || "$0", stage: "Lead" },
    ]);
    toast.success("New CRM Lead added");
  };

  const handleApproveRequest = (id: string) => {
    setCreativeRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Approved" } : r))
    );
    toast.success("Creative Request Approved");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary animate-pulse" /> Gexart OS Agency ERP
          </h1>
          <p className="text-muted-foreground mt-1">Unified operations console for Sales, Marketing, SEO & Design.</p>
        </div>
      </div>

      <Tabs defaultValue="crm" className="w-full">
        <TabsList className="grid grid-cols-4 bg-muted/60 border rounded-lg p-1 max-w-xl">
          <TabsTrigger value="crm" className="gap-2"><Target className="h-4 w-4" /> CRM</TabsTrigger>
          <TabsTrigger value="seo" className="gap-2"><Search className="h-4 w-4" /> SEO</TabsTrigger>
          <TabsTrigger value="ppc" className="gap-2"><BarChart3 className="h-4 w-4" /> PPC</TabsTrigger>
          <TabsTrigger value="creative" className="gap-2"><Palette className="h-4 w-4" /> Creative</TabsTrigger>
        </TabsList>

        {/* CRM Pipeline */}
        <TabsContent value="crm" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Active Sales Pipeline</h3>
            <Button onClick={handleAddLead} size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {["Lead", "Proposal", "Negotiation"].map((stage) => (
              <Card key={stage} className="border bg-card/40 backdrop-blur-md">
                <CardHeader className="py-3.5 border-b border-border/40">
                  <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground flex justify-between">
                    <span>{stage}</span>
                    <Badge variant="outline" className="bg-primary/5 text-primary">
                      {crmLeads.filter((l) => l.stage === stage).length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {crmLeads
                    .filter((l) => l.stage === stage)
                    .map((l) => (
                      <div key={l.id} className="p-3 rounded-lg border bg-background/50 hover:border-primary/20 transition-all">
                        <h4 className="font-semibold text-sm">{l.name}</h4>
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
                          <span>Est: {l.value}</span>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SEO Rankings */}
        <TabsContent value="seo" className="mt-6 space-y-4">
          <Card className="border bg-card/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">SEO Rank Tracking</CardTitle>
              <CardDescription>Live search visibility and organic rank positions.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider font-mono">
                      <th className="py-2.5">Target Keyword</th>
                      <th className="py-2.5 text-center">Google Position</th>
                      <th className="py-2.5 text-right">Weekly Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seoKeywords.map((k, idx) => (
                      <tr key={idx} className="border-b border-border/40 hover:bg-muted/20">
                        <td className="py-3 font-semibold">{k.keyword}</td>
                        <td className="py-3 text-center font-mono">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            #{k.rank}
                          </Badge>
                        </td>
                        <td className="py-3 text-right font-mono text-xs">{k.change}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PPC Campaigns */}
        <TabsContent value="ppc" className="mt-6 space-y-4">
          <Card className="border bg-card/40 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Ad campaign Performance</CardTitle>
              <CardDescription>Google and Meta paid marketing channels.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {ppcCampaigns.map((c, idx) => (
                  <div key={idx} className="p-4 rounded-xl border bg-background/50 hover:border-primary/20 transition-all space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold text-sm">{c.name}</h4>
                      <Badge className="font-mono text-[10px]">{c.budget}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs">
                      <div>
                        <span className="text-muted-foreground">ROAS:</span>
                        <p className="font-bold text-sm text-emerald-500 font-mono mt-0.5">{c.roas}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">CTR:</span>
                        <p className="font-bold text-sm font-mono mt-0.5">{c.ctr}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Creative Board */}
        <TabsContent value="creative" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Creative & Shoot Requests</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {creativeRequests.map((r) => (
              <Card key={r.id} className="border bg-card/40 backdrop-blur-md hover:border-primary/20 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="font-semibold text-[10px]">{r.type}</Badge>
                    <Badge className={r.status === "Approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-yellow-500/10 text-yellow-500"}>
                      {r.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold mt-2.5">{r.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-2 flex justify-end">
                  {r.status !== "Approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 rounded-full text-xs font-semibold"
                      onClick={() => handleApproveRequest(r.id)}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
