using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using AcmeHR.Application.Attachments;
using Microsoft.Extensions.Options;

namespace AcmeHR.Infrastructure.Attachments;

/// <summary>
/// IFileStorage backed by any S3-compatible bucket (Cloudflare R2 via Storage:S3ServiceUrl,
/// or real AWS S3 if that's left unset). Attachments stay private in the bucket — bytes are
/// always fetched server-side here and streamed back through the already-authorized
/// AttachmentService.DownloadAsync call, never exposed via a public bucket URL.
/// </summary>
public class S3FileStorage : IFileStorage
{
    private readonly IAmazonS3 client;
    private readonly string bucketName;

    public S3FileStorage(IOptions<FileStorageSettings> settings)
    {
        var options = settings.Value;
        if (string.IsNullOrWhiteSpace(options.S3BucketName))
        {
            throw new InvalidOperationException("Storage:S3BucketName must be set when Storage:Provider is \"S3\".");
        }

        bucketName = options.S3BucketName;

        var config = new AmazonS3Config
        {
            ServiceURL = options.S3ServiceUrl,
            // Required for R2 and most non-AWS S3-compatible endpoints, which don't support
            // AWS's virtual-hosted-style (bucket.account.provider.com) addressing.
            ForcePathStyle = !string.IsNullOrWhiteSpace(options.S3ServiceUrl),
            AuthenticationRegion = options.S3Region,
        };

        client = string.IsNullOrWhiteSpace(options.S3AccessKeyId)
            ? new AmazonS3Client(config)
            : new AmazonS3Client(new BasicAWSCredentials(options.S3AccessKeyId, options.S3SecretAccessKey), config);
    }

    public async Task SaveAsync(string storageKey, byte[] content, string contentType, CancellationToken cancellationToken = default)
    {
        using var stream = new MemoryStream(content);
        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = bucketName,
            Key = storageKey,
            InputStream = stream,
            ContentType = contentType,
        }, cancellationToken);
    }

    public async Task<byte[]?> ReadAsync(string storageKey, CancellationToken cancellationToken = default)
    {
        try
        {
            using var response = await client.GetObjectAsync(bucketName, storageKey, cancellationToken);
            using var memory = new MemoryStream();
            await response.ResponseStream.CopyToAsync(memory, cancellationToken);
            return memory.ToArray();
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
