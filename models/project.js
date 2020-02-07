const fs = require('fs'); //file system
const jwt = require('jsonwebtoken'); //generate json token
const Joi = require('joi');
//const PasswordComplexity = require('joi-password-complexity');
const bcrypt = require('bcryptjs'); // for password encryption
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');
var _this = this;

const projectSchema = function (project) {
    this.code = project.project_code;
    this.project_name = project.project_name;
    this.project_topic = project.project_topic;
    this.project_type_id = project.project_package; // Plan Package
    this.project_dtl = project.project_details;
    this.quantity = project.quantity;
    this.word_count = project.word_count;
    this.project_cost = project.project_cost;
    this.user_id = project.user_id;
    this.project_file = project.project_file;
    this.project_cdate = new Date();
    this.project_type = project.project_type; // new Field
    this.additional_resources = project.additional_resources; // new Field
    this.choice_of_writers = project.choice_of_writers; // new Field
    this.writers_career = project.writers_career; // new Field
    //this.writers_age = project.writers_age; // new Field
    this.writers_age = '18-25';
    this.writers_location = project.writers_location; // new Field
    
    //this.keyword_id = project.keyword_id;
    //this.keyword_id = project.project_images;
}


projectSchema.createProject = async function (newProject, result) {

    sql("INSERT INTO fw_project set ?", newProject, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(err, null);
        } else {
            //console.log(res);
            result(null, res.insertId);
        }
    });
};

projectSchema.deleteProject = async function (newProjectId, result) {

    sql("DELETE FROM fw_project WHERE id = ?", newProjectId, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

projectSchema.getProjectPackages = function (status, result) {
    sql("Select * from fw_project_type where status = ? ", status, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

projectSchema.getProjectListings = function (obj, result) {
    let skip = obj.skip;
    let limit = obj.limit;
    let user_id = obj.user_id    
    sql("SELECT COUNT(*) as totalProjects from fw_project where user_id =?", user_id, function (err, count) {
        sql("SELECT * from fw_project where user_id=" + user_id + " LIMIT " + skip + "," + limit, function (err, res) {
            if (err) {
                //console.log(err);              
                result(err, null);
            } else {
                //console.log(res);
                result(null, { projects: res, count: count });
            }
        });
    })
};

const projectJoiSchema = {

    project_code: Joi.string().trim().min(10).max(10).required(),
    project_name: Joi.string().trim().min(2).max(50).required(),
    project_topic: Joi.string().trim().min(2).max(50).required(),
    project_type: Joi.string().trim().min(2).max(50).required(),
    quantity: Joi.number().required(),
    word_count: Joi.number().required(),
    project_details: Joi.string().trim().required(),
    additional_resources: Joi.string().trim().allow(''),
    additional_resources: Joi.string().trim().allow(''),
    project_package: Joi.string().trim().required(),
    project_cost: Joi.string().trim().required(),
    choice_of_writers: Joi.string().trim().allow(''),
    writers_career: Joi.string().trim().allow(''),
    writers_location: Joi.string().trim().allow(''),
    project_files: Joi.array().items(
        Joi.object().keys({
            file_path: Joi.string().trim(),
            file_name: Joi.string().trim(),
            file_key: Joi.string().trim(),
            file_category: Joi.string().trim(),
        })
    )


}

//validate create project 
function validateProject(project) {
    return Joi.validate(project, projectJoiSchema, { allowUnknown: true });
}

module.exports.projectSchema = projectSchema;
module.exports.validateProject = validateProject;