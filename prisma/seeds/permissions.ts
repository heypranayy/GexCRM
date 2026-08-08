import { PrismaClient } from "@prisma/client";

export async function seedPermissions(prisma: PrismaClient) {
  console.log("Seeding Gexart OS Organizational Structure & Permissions...");

  // 1. Create a default Company
  const company = await prisma.company.upsert({
    where: { id: "00000000-0000-0000-0000-000000000000" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "GEXART Headquarters",
      domain: "gexart.com",
    },
  });

  // 2. Create a default Branch
  const branch = await prisma.branch.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {
      officeLat: 19.076,
      officeLng: 72.8777,
      geofenceRadiusMeters: 200,
    },
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Mumbai HQ",
      companyId: company.id,
      officeLat: 19.076,
      officeLng: 72.8777,
      geofenceRadiusMeters: 200,
    },
  });

  // 3. Create Departments
  const departmentsList = [
    "Management",
    "Operations",
    "HR",
    "Accounts",
    "Sales",
    "Business Development",
    "Project Management",
    "SEO",
    "Google Ads",
    "Meta Ads",
    "Content",
    "Graphic Design",
    "Video Editing",
    "UI UX",
    "Development",
    "QA",
    "Support",
    "Legal",
    "Audit",
    "AI Automation",
  ];

  const departments: Record<string, any> = {};
  for (const deptName of departmentsList) {
    departments[deptName] = await prisma.department.create({
      data: {
        name: deptName,
        branchId: branch.id,
      },
    });
  }

  // 4. Create Designations
  const designationsList = [
    "CEO",
    "COO",
    "HR Manager",
    "Chief Accountant",
    "Sales Lead",
    "BD Executive",
    "Project Manager",
    "SEO Specialist",
    "PPC Lead",
    "Content Writer",
    "Senior Graphic Designer",
    "Lead Video Editor",
    "UI/UX Designer",
    "React Developer",
    "WordPress Developer",
    "Shopify Developer",
    "Laravel Developer",
    "Flutter Developer",
    "QA Engineer",
    "Support Agent",
    "Legal Counsel",
    "Auditor",
    "AI Automation Engineer",
    "Intern",
  ];

  const designations: Record<string, any> = {};
  for (const desName of designationsList) {
    designations[desName] = await prisma.designation.create({
      data: {
        name: desName,
      },
    });
  }

  // 5. Create Permission Matrix
  const resources = ["attendance", "finance", "projects", "tasks", "crm", "seo", "ppc", "creative", "tickets", "users"];
  const roles = ["admin", "manager", "user"];

  const defaultMatrix: Record<string, Record<string, string[]>> = {
    admin: {
      attendance: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
      finance: ["read", "create", "update", "delete", "approve", "export", "import", "financial_access", "salary_access", "admin_access"],
      projects: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
      tasks: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
      crm: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "client_access", "admin_access"],
      seo: ["read", "create", "update", "delete", "approve", "export", "import", "admin_access"],
      ppc: ["read", "create", "update", "delete", "approve", "export", "import", "admin_access"],
      creative: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
      tickets: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
      users: ["read", "create", "update", "delete", "approve", "assign", "export", "import", "admin_access"],
    },
    manager: {
      attendance: ["read", "create", "update", "approve", "assign", "export"],
      finance: ["read", "export"],
      projects: ["read", "create", "update", "approve", "assign", "export"],
      tasks: ["read", "create", "update", "approve", "assign", "export"],
      crm: ["read", "create", "update", "assign", "client_access"],
      seo: ["read", "create", "update"],
      ppc: ["read", "create", "update"],
      creative: ["read", "create", "update", "approve", "assign"],
      tickets: ["read", "create", "update", "assign"],
      users: ["read"],
    },
    user: {
      attendance: ["read", "create"],
      finance: [],
      projects: ["read"],
      tasks: ["read", "update"],
      crm: ["read"],
      seo: ["read"],
      ppc: ["read"],
      creative: ["read", "create"],
      tickets: ["read", "create"],
      users: [],
    },
  };

  for (const role of roles) {
    for (const resource of resources) {
      const actions = defaultMatrix[role][resource] || [];
      await prisma.permissionMatrix.upsert({
        where: { role_resource: { role, resource } },
        update: { actions },
        create: { role, resource, actions },
      });
    }
  }

  // 6. Connect default test user to Organization Structure
  const testUserEmail = process.env.SEED_ADMIN_EMAIL || "admin@gexart.com";
  const testUser = await prisma.users.findUnique({
    where: { email: testUserEmail },
  });

  if (testUser) {
    await prisma.users.update({
      where: { id: testUser.id },
      data: {
        companyId: company.id,
        branchId: branch.id,
        departmentId: departments["Management"].id,
        designationId: designations["CEO"].id,
        role: "admin",
      },
    });
    console.log(`Connected test user (${testUserEmail}) to Company, Branch, Department (Management), and Designation (CEO).`);
  }

  console.log("Seeding Gexart OS Organizational Structure & Permissions completed.");
}
