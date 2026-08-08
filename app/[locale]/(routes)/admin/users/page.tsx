import { getUsers } from "@/actions/get-users";
import React from "react";
import Container from "../../components/ui/Container";
import { InviteForm } from "./components/IviteForm";
import { Separator } from "@/components/ui/separator";

import { getSession } from "@/lib/auth-server";
import { AdminUserDataTable } from "./table-components/data-table";
import { columns } from "./table-components/columns";
import { Button } from "@/components/ui/button";
import SendMailToAll from "./components/send-mail-to-all";
import { getTranslations } from "next-intl/server";

const AdminUsersPage = async () => {
  const users = await getUsers();
  const serializedUsers = users.map((u) => ({
    ...u,
    baseSalary: u.baseSalary != null ? Number(u.baseSalary) : null,
  }));
  const t = await getTranslations("AdminPage");

  const session = await getSession();

  if (session?.user?.role !== "admin") {
    return (
      <Container
        title={t("title")}
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }

  return (
    <Container
      title={t("users.title")}
      description={t("users.description")}
    >
      <div className="flex-col1">
        <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
          {t("users.inviteHeading")}
        </h4>
        <InviteForm />
      </div>
      <Separator />
      <div>
        <SendMailToAll />
      </div>
      <Separator />

      <AdminUserDataTable columns={columns} data={serializedUsers} />
    </Container>
  );
};

export default AdminUsersPage;
