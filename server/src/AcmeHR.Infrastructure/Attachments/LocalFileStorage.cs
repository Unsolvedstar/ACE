using AcmeHR.Application.Attachments;
using Microsoft.Extensions.Options;

namespace AcmeHR.Infrastructure.Attachments;

/// <summary>
/// Disk-backed IFileStorage. Only for local development — files live on the app's own
/// filesystem, which is wiped on every redeploy/restart on any container-based host, so this
/// must never be the provider used for a real deployment (see Storage:Provider = "S3").
/// </summary>
public class LocalFileStorage(IOptions<FileStorageSettings> settings) : IFileStorage
{
    public async Task SaveAsync(string storageKey, byte[] content, string contentType, CancellationToken cancellationToken = default)
    {
        var root = ResolveRootPath();
        Directory.CreateDirectory(root);
        await File.WriteAllBytesAsync(Path.Combine(root, storageKey), content, cancellationToken);
    }

    public async Task<byte[]?> ReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        var filePath = Path.Combine(ResolveRootPath(), storageKey);
        return File.Exists(filePath) ? await File.ReadAllBytesAsync(filePath, cancellationToken) : null;
    }

    private string ResolveRootPath() =>
        string.IsNullOrWhiteSpace(settings.Value.UploadsRootPath)
            ? Path.Combine(AppContext.BaseDirectory, "App_Data", "uploads")
            : settings.Value.UploadsRootPath;
}
