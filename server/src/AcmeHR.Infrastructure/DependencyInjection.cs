using System.Runtime.CompilerServices;
using System.Text;
using AcmeHR.Application.Account;
using AcmeHR.Application.Acknowledgments;
using AcmeHR.Application.Agents;
using AcmeHR.Application.Announcements;
using AcmeHR.Application.Attachments;
using AcmeHR.Application.Auth;
using AcmeHR.Application.Boards;
using AcmeHR.Application.Certificates;
using AcmeHR.Application.Common.Interfaces;
using AcmeHR.Application.Dashboard;
using AcmeHR.Application.Documents;
using AcmeHR.Application.Employees;
using AcmeHR.Application.Folders;
using AcmeHR.Application.Incidents;
using AcmeHR.Application.Leave;
using AcmeHR.Application.LegalAppointments;
using AcmeHR.Application.Medical;
using AcmeHR.Application.Kpi;
using AcmeHR.Application.Notifications;
using AcmeHR.Application.Policies;
using AcmeHR.Application.Ppe;
using AcmeHR.Application.Reports;
using AcmeHR.Application.Sites;
using AcmeHR.Application.Spaces;
using AcmeHR.Application.Timesheet;
using AcmeHR.Application.WorkShift;
using AcmeHR.Application.Workflows;
using AcmeHR.Infrastructure.Auth;
using AcmeHR.Infrastructure.Identity;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using QuestPDF.Infrastructure;

namespace AcmeHR.Infrastructure;

internal static class QuestPdfLicenseInitializer
{
    // Runs once when this assembly loads — covers both the API host (via AddInfrastructure)
    // and unit tests that construct services like BoardTaskService directly without DI.
    //
    // Community license is free only for organizations under $1M USD annual revenue.
    // Confirm AcmeHR qualifies, or purchase a commercial QuestPDF license, before
    // shipping this to production — see https://www.questpdf.com/pricing.html.
#pragma warning disable CA2255 // Deliberate: guarantees the license is set for every host (API, tests), not just DI-based startup.
    [ModuleInitializer]
    internal static void SetLicense() => QuestPDF.Settings.License = LicenseType.Community;
#pragma warning restore CA2255
}

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));

        services
            .AddIdentityCore<AppUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.User.RequireUniqueEmail = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                options.Lockout.AllowedForNewUsers = true;
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<ApplicationDbContext>()
            .AddDefaultTokenProviders();

        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.Configure<Attachments.FileStorageSettings>(configuration.GetSection(Attachments.FileStorageSettings.SectionName));
        services.Configure<Agents.AiProviderSettings>(configuration.GetSection(Agents.AiProviderSettings.SectionName));

        var jwtSettings = configuration.GetSection(JwtSettings.SectionName).Get<JwtSettings>() ?? new JwtSettings();

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key))
                };

                // WebSocket upgrade requests can't carry a custom Authorization header, so the
                // SignalR client sends the token as an access_token query param instead. Only
                // trust that fallback for hub paths — everywhere else still requires a bearer header.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var accessToken = context.Request.Query["access_token"];
                        if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                        {
                            context.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();

        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAnnouncementService, Announcements.AnnouncementService>();
        services.AddScoped<IAccountService, Account.AccountService>();
        services.AddScoped<ICertificateService, Certificates.CertificateService>();
        services.AddScoped<IKpiService, Kpi.KpiService>();
        services.AddScoped<ITimesheetService, Timesheet.TimesheetService>();
        services.AddScoped<IWorkShiftService, WorkShift.WorkShiftService>();
        services.AddScoped<IPostedScheduleDocumentService, WorkShift.PostedScheduleDocumentService>();
        services.AddScoped<ILeaveService, Leave.LeaveService>();
        services.AddScoped<IDashboardService, Dashboard.DashboardService>();
        services.AddScoped<IPolicyService, Policies.PolicyService>();
        services.AddScoped<IMedicalService, Medical.MedicalService>();
        services.AddScoped<IPpeService, Ppe.PpeService>();
        services.AddScoped<IIncidentService, Incidents.IncidentService>();
        services.AddScoped<ILegalAppointmentService, LegalAppointments.LegalAppointmentService>();
        services.AddScoped<IReportsService, Reports.ReportsService>();
        services.AddScoped<IEmployeeDirectoryService, Employees.EmployeeDirectoryService>();
        services.AddScoped<IAttachmentService, Attachments.AttachmentService>();
        services.AddScoped<IAcknowledgmentService, Acknowledgments.AcknowledgmentService>();
        services.AddScoped<INotificationService, Notifications.NotificationService>();
        services.AddScoped<ISiteService, Sites.SiteService>();
        services.AddScoped<ISpaceService, Spaces.SpaceService>();
        services.AddScoped<IFolderService, Folders.FolderService>();
        services.AddScoped<IBoardService, Boards.BoardService>();
        services.AddScoped<IBoardTaskService, Boards.BoardTaskService>();
        services.AddScoped<IBoardPerformanceService, Boards.BoardPerformanceService>();
        services.AddScoped<IDocumentSigningService, Documents.DocumentSigningService>();
        services.AddScoped<Agents.AgentToolDispatcher>();
        services.AddScoped<Agents.BoardContextBuilder>();
        services.AddScoped<IAgentService, Agents.AgentService>();
        services.AddScoped<IAgentActionService, Agents.AgentActionService>();
        services.AddScoped<IAgentSettingsService, Agents.AgentSettingsService>();
        services.AddScoped<IWorkflowService, Workflows.WorkflowService>();
        services.AddScoped<IWorkflowRunService, Workflows.WorkflowRunService>();
        services.AddScoped<IWorkflowRunExecutor, Workflows.WorkflowRunExecutor>();
        services.AddSingleton<Workflows.WorkflowGraphSecretProtector>();
        services.AddSingleton<IWorkflowRunQueue, Workflows.WorkflowRunQueue>();

        // AiProvider:Provider selects the implementation: "Mock" (default, zero external calls),
        // "Ollama" (free local model, no API key/billing — requires Ollama running locally), or
        // later "AnthropicClaude". No Agents call site changes when switching between them.
        var aiProviderSettings = configuration.GetSection(Agents.AiProviderSettings.SectionName).Get<Agents.AiProviderSettings>()
            ?? new Agents.AiProviderSettings();
        if (string.Equals(aiProviderSettings.Provider, "Ollama", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<IAiProvider, Agents.OllamaAiProvider>((sp, client) =>
            {
                var opts = sp.GetRequiredService<IOptions<Agents.AiProviderSettings>>().Value;
                client.BaseAddress = new Uri(string.IsNullOrWhiteSpace(opts.BaseUrl) ? "http://localhost:11434" : opts.BaseUrl);
                // Local model inference (especially the first call after a cold start) can take
                // a while on modest hardware — well beyond a typical API call's timeout.
                client.Timeout = TimeSpan.FromMinutes(3);
            });
        }
        else
        {
            services.AddScoped<IAiProvider, Agents.RuleBasedAiProvider>();
        }

        // Storage:Provider selects the implementation: "Local" (default, disk-backed — dev only,
        // wiped on every redeploy/restart) or "S3" (any S3-compatible bucket, e.g. Cloudflare R2).
        // No Attachments call site changes when switching between them.
        var fileStorageSettings = configuration.GetSection(Attachments.FileStorageSettings.SectionName).Get<Attachments.FileStorageSettings>()
            ?? new Attachments.FileStorageSettings();
        if (string.Equals(fileStorageSettings.Provider, "S3", StringComparison.OrdinalIgnoreCase))
        {
            services.AddSingleton<IFileStorage, Attachments.S3FileStorage>();
        }
        else
        {
            services.AddSingleton<IFileStorage, Attachments.LocalFileStorage>();
        }

        services.AddHttpClient<IWebhookSender, Workflows.WebhookSender>((sp, client) =>
        {
            client.Timeout = TimeSpan.FromSeconds(15);
        });

        // No credential vault in this pass - only per-node webhook URLs/headers need protecting
        // at rest (see WorkflowGraphSecretProtector), and Data Protection is the built-in way to
        // do that without a new dependency.
        services.AddDataProtection();

        services.AddHostedService<Auth.RefreshTokenCleanupService>();
        services.AddHostedService<Workflows.WorkflowExecutionWorker>();

        return services;
    }
}
