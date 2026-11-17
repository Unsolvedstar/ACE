namespace AcmeHR.Infrastructure.Attachments;

public class FileStorageSettings
{
    public const string SectionName = "Storage";

    // "Local" (default, disk-backed — dev only, not durable across a redeploy/restart) |
    // "S3" (any S3-compatible bucket: Cloudflare R2, AWS S3, MinIO, ...).
    public string Provider { get; set; } = "Local";

    /// <summary>
    /// Local disk directory attachments are written to when Provider is "Local". Defaults to
    /// App_Data/uploads under the app's base directory when unset.
    /// </summary>
    public string UploadsRootPath { get; set; } = string.Empty;

    // S3-compatible settings, used when Provider is "S3".
    public string? S3BucketName { get; set; }

    /// <summary>
    /// Custom endpoint for an S3-compatible provider, e.g. Cloudflare R2's
    /// "https://&lt;account_id&gt;.r2.cloudflarestorage.com". Leave unset to talk to real AWS S3.
    /// </summary>
    public string? S3ServiceUrl { get; set; }

    public string? S3AccessKeyId { get; set; }
    public string? S3SecretAccessKey { get; set; }

    /// <summary>R2 has no real regions, but the AWS SDK's request signing still requires a value — "auto" works for R2.</summary>
    public string S3Region { get; set; } = "auto";
}
