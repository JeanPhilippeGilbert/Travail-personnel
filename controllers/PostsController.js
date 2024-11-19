import PostModel from '../models/post.js';
import Repository from '../models/repository.js';
import Controller from './Controller.js';

export default class PostsController extends Controller{
    constructor(HttpContext) {
        super(HttpContext, new Repository(new PostModel()));
        data.Creation = Date.now();
        console.log(Date.now());
    }


    post(data) {
        console.info("in");
        // Ajoute la date de création avant d'appeler le repository
        // Appelle le repository pour ajouter l'élément
        data = this.repository.add(data);
    
        if (this.repository.model.state.isValid) {
            this.HttpContext.response.created(data);
        } else {
            if (this.repository.model.state.inConflict)
                this.HttpContext.response.conflict(this.repository.model.state.errors);
            else
                this.HttpContext.response.badRequest(this.repository.model.state.errors);
        }
    }
    put(data) {
        //if (!isNaN(this.HttpContext.path.id)) {
        if (this.HttpContext.path.id !== '') {
            data = this.repository.update(this.HttpContext.path.id, data);
            if (this.repository.model.state.isValid) {
                this.HttpContext.response.accepted(data);
            } else {
                if (this.repository.model.state.notFound) {
                    this.HttpContext.response.notFound(this.repository.model.state.errors);
                } else {
                    if (this.repository.model.state.inConflict)
                        this.HttpContext.response.conflict(this.repository.model.state.errors)
                    else
                        this.HttpContext.response.badRequest(this.repository.model.state.errors);
                }
            }
        } else
            this.HttpContext.response.badRequest("The Id of ressource is not specified in the request url.")
    }
}