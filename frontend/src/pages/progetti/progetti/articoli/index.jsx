// Esportazione centralizzata di tutti i componenti per gli articoli di progetto
import ProjectArticlesTab from "./ProjectArticlesTab";
import ArticlesList from "./ArticlesList";
import ArticleDetails from "./ArticleDetails";
import BOMViewer from "./BOMViewer";
import ArticleForm from "./ArticleForm";
import ArticlePage from "./ArticlePage";
import BOMComponentForm from "./BOMComponentForm";
import BOMRoutingForm from "./BOMRoutingForm";
import ArticleReferences from "./ArticleReferences";
import ArticleActionsDropdown from "./ArticleActionsDropdown";

export {
  ProjectArticlesTab,
  ArticlesList,
  ArticleDetails,
  BOMViewer,
  ArticleForm,
  ArticlePage,
  BOMComponentForm,
  BOMRoutingForm,
  ArticleReferences,
  ArticleActionsDropdown,
};

// Esportazione di default di ProjectArticlesTab per l'integrazione con il progetto
export default ProjectArticlesTab;
