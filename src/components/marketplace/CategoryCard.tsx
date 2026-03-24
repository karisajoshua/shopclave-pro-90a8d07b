import { Link } from "react-router-dom";

interface CategoryCardProps {
  name: string;
  slug: string;
  image: string;
}

const CategoryCard = ({ name, slug, image }: CategoryCardProps) => (
  <Link
    to={`/category/${slug}`}
    className="group flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-marketplace-orange-light transition-colors"
  >
    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-secondary border-2 border-border group-hover:border-primary transition-colors">
      <img src={image} alt={name} className="w-full h-full object-cover" loading="lazy" />
    </div>
    <span className="text-xs md:text-sm font-medium text-center text-foreground">{name}</span>
  </Link>
);

export default CategoryCard;
