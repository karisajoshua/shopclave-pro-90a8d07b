import MediaLibrary from "@/components/media/MediaLibrary";

const AdminMedia = () => {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Media Library</h1>
        <p className="text-muted-foreground text-sm">Manage product images across all vendors. Upload, edit, delete, or copy a short link.</p>
      </div>
      <MediaLibrary mode="admin" />
    </div>
  );
};

export default AdminMedia;
