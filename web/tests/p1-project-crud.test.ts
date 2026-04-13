import { describe, expect, it } from "vitest";
import {
  createProject,
  updateProject,
  deleteProject,
  getProjectBySlug,
  listProjects,
} from "../src/lib/repository";

describe("createProject", () => {
  it("creates a project for a user with a creator profile", async () => {
    const project = await createProject({
      title: "Test Project",
      oneLiner: "A test project for vitest",
      description: "This is a test project created during automated testing of the P1 backend.",
      techStack: ["Next.js", "Vitest"],
      tags: ["test"],
      status: "idea",
      creatorUserId: "u1",
    });
    expect(project.title).toBe("Test Project");
    expect(project.slug).toContain("test-project");
    expect(project.status).toBe("idea");
    expect(project.techStack).toEqual(["Next.js", "Vitest"]);
  });

  it("throws CREATOR_PROFILE_REQUIRED for user without creator profile", async () => {
    await expect(
      createProject({
        title: "No Profile",
        oneLiner: "Will fail",
        description: "This should fail because u3 has no creator profile.",
        techStack: [],
        tags: [],
        status: "idea",
        creatorUserId: "u3",
      })
    ).rejects.toThrow("CREATOR_PROFILE_REQUIRED");
  });
});

describe("updateProject", () => {
  it("creator can update project fields", async () => {
    const project = await createProject({
      title: "Updatable Project",
      oneLiner: "Will be updated",
      description: "This project will be updated in tests to verify update works.",
      techStack: ["TypeScript"],
      tags: ["update-test"],
      status: "idea",
      creatorUserId: "u1",
    });

    const updated = await updateProject({
      projectSlug: project.slug,
      actorUserId: "u1",
      title: "Updated Title",
      status: "building",
    });
    expect(updated.title).toBe("Updated Title");
    expect(updated.status).toBe("building");
  });

  it("non-creator cannot update", async () => {
    const project = await createProject({
      title: "Guarded Project",
      oneLiner: "Cannot be updated by others",
      description: "Only the creator of this project should be allowed to update it.",
      techStack: [],
      tags: [],
      status: "idea",
      creatorUserId: "u1",
    });

    await expect(
      updateProject({
        projectSlug: project.slug,
        actorUserId: "u2",
        title: "Hijacked",
      })
    ).rejects.toThrow("FORBIDDEN_NOT_CREATOR");
  });

  it("throws PROJECT_NOT_FOUND for non-existent slug", async () => {
    await expect(
      updateProject({
        projectSlug: "nonexistent-project-slug",
        actorUserId: "u1",
        title: "Ghost",
      })
    ).rejects.toThrow("PROJECT_NOT_FOUND");
  });
});

describe("deleteProject", () => {
  it("creator can delete their own project", async () => {
    const project = await createProject({
      title: "Delete Me",
      oneLiner: "To be deleted",
      description: "This project exists only to be deleted in tests.",
      techStack: [],
      tags: ["delete-test"],
      status: "idea",
      creatorUserId: "u1",
    });

    await deleteProject({
      projectSlug: project.slug,
      actorUserId: "u1",
      actorRole: "user",
    });

    const found = await getProjectBySlug(project.slug);
    expect(found).toBeNull();
  });

  it("admin can delete any project", async () => {
    const project = await createProject({
      title: "Admin Delete",
      oneLiner: "Admin will remove",
      description: "Admin should be able to delete any project regardless of ownership.",
      techStack: [],
      tags: [],
      status: "idea",
      creatorUserId: "u2",
    });

    await deleteProject({
      projectSlug: project.slug,
      actorUserId: "u1",
      actorRole: "admin",
    });

    const found = await getProjectBySlug(project.slug);
    expect(found).toBeNull();
  });

  it("non-creator non-admin cannot delete", async () => {
    const project = await createProject({
      title: "Protected Project",
      oneLiner: "Cannot be deleted",
      description: "Regular users who are not the creator should not be able to delete this project.",
      techStack: [],
      tags: [],
      status: "idea",
      creatorUserId: "u1",
    });

    await expect(
      deleteProject({
        projectSlug: project.slug,
        actorUserId: "u2",
        actorRole: "user",
      })
    ).rejects.toThrow("FORBIDDEN_NOT_CREATOR");
  });
});

describe("listProjects with creatorId filter", () => {
  it("filters projects by creatorId", async () => {
    const result = await listProjects({ creatorId: "c1", page: 1, limit: 100 });
    result.items.forEach((p) => {
      expect(p.creatorId).toBe("c1");
    });
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("returns empty for non-existent creator", async () => {
    const result = await listProjects({ creatorId: "nonexistent", page: 1, limit: 100 });
    expect(result.items).toHaveLength(0);
  });
});
