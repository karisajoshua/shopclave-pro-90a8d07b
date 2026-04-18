import MediaLibrary from "@/components/media/MediaLibrary";

const VendorMedia = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Media Library</h1>
        <p className="text-muted-foreground text-sm">Manage your product images. Upload, edit, delete, or copy a short link to share.</p>
      </div>
      <MediaLibrary mode="vendor" />
    </div>
  );
};

export default VendorMedia;
