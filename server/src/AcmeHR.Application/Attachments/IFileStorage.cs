namespace AcmeHR.Application.Attachments;

/// <summary>
/// Provider-agnostic boundary for where uploaded attachment bytes actually live. Access
/// control stays entirely in AttachmentService — this only stores/retrieves bytes by an
/// opaque key, so the disk-backed dev provider and a durable S3-compatible provider can be
/// swapped via config alone (Storage:Provider), same pattern as IAiProvider.
/// </summary>
public interface IFileStorage
{
    Task SaveAsync(string storageKey, byte[] content, string contentType, CancellationToken cancellationToken = default);

    Task<byte[]?> ReadAsync(string storageKey, CancellationToken cancellationToken = default);
}
