export const uploadImage = async (file: File) => {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch("http://localhost:3000/upload", {
    method: "POST",
    body: form
  });

  const data = await res.json();
  return data.imageUrl;
};
