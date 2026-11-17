using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace AcmeHR.Infrastructure.Persistence;

public static class DatabaseSeeder
{
    // Public self-registration only allows the Employee role, so at least one HR account must
    // already exist to assign other roles. The bootstrap accounts' password is never hard-coded:
    // it comes from configuration (`Seed:BootstrapPassword` — user-secrets locally, an environment
    // variable / secret store when deployed). If it isn't set, the accounts are simply not created.
    public const string BootstrapPasswordConfigKey = "Seed:BootstrapPassword";

    public static async Task SeedAsync(IServiceProvider services)
    {
        await SeedRolesAsync(services);
        var site = await SeedDefaultSiteAsync(services);
        await SeedBootstrapAccountsAsync(services, site);
        await SeedKpiTemplatesAsync(services);
    }

    private static async Task SeedBootstrapAccountsAsync(IServiceProvider services, Site site)
    {
        var password = services.GetRequiredService<IConfiguration>()[BootstrapPasswordConfigKey];
        if (string.IsNullOrWhiteSpace(password))
        {
            services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseSeeder)).LogWarning(
                "{Key} is not set - skipping the bootstrap HR/Executive accounts. Set it (e.g. with " +
                "`dotnet user-secrets set \"{Key}\" \"<password>\"`) to create them on a fresh database.",
                BootstrapPasswordConfigKey, BootstrapPasswordConfigKey);
            return;
        }

        await SeedBootstrapAccountAsync(services, site, "hr.admin@acmehr.local", "HR-ADMIN-001", EmployeeRole.HR, password);
        await SeedBootstrapAccountAsync(services, site, "exec.admin@acmehr.local", "EXEC-ADMIN-001", EmployeeRole.Executive, password);
    }

    private static async Task SeedKpiTemplatesAsync(IServiceProvider services)
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();

        if (await dbContext.KpiTemplates.AnyAsync())
        {
            return;
        }

        dbContext.KpiTemplates.AddRange(Kpi.KpiTemplateSeedData.BuildTemplates());
        await dbContext.SaveChangesAsync();
    }

    private static async Task SeedRolesAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

        foreach (var role in Enum.GetValues<EmployeeRole>())
        {
            var roleName = role.ToString();
            if (!await roleManager.RoleExistsAsync(roleName))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid>(roleName));
            }
        }
    }

    private static async Task<Site> SeedDefaultSiteAsync(IServiceProvider services)
    {
        var dbContext = services.GetRequiredService<ApplicationDbContext>();

        var site = await dbContext.Sites.FirstOrDefaultAsync();
        if (site is null)
        {
            site = new Site
            {
                Id = Guid.NewGuid(),
                Name = "Head Office",
                Location = "South Africa"
            };
            dbContext.Sites.Add(site);
            await dbContext.SaveChangesAsync();
        }

        return site;
    }

    private static async Task SeedBootstrapAccountAsync(
        IServiceProvider services, Site site, string email, string employeeNumber, EmployeeRole role, string password)
    {
        var userManager = services.GetRequiredService<UserManager<AppUser>>();
        var dbContext = services.GetRequiredService<ApplicationDbContext>();

        if (await userManager.FindByEmailAsync(email) is not null)
        {
            return;
        }

        var user = new AppUser { UserName = email, Email = email };
        var createResult = await userManager.CreateAsync(user, password);
        if (!createResult.Succeeded)
        {
            // Most likely the configured password doesn't satisfy the Identity password policy.
            services.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(DatabaseSeeder)).LogError(
                "Could not create bootstrap account {Email}: {Errors}",
                email, string.Join("; ", createResult.Errors.Select(e => e.Description)));
            return;
        }

        await userManager.AddToRoleAsync(user, role.ToString());

        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            EmployeeNumber = employeeNumber,
            FirstName = role.ToString(),
            LastName = "Admin",
            JobTitle = $"{role} Administrator",
            Role = role,
            SiteId = site.Id,
        };

        user.EmployeeId = employee.Id;

        dbContext.Employees.Add(employee);
        await dbContext.SaveChangesAsync();
        await userManager.UpdateAsync(user);
    }
}
