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
    this.writers_age = project.writers_age; // new Field
    //this.writers_age = '18-25';
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

projectSchema.getProjectDetailsById = function (obj, result) {

    let project_id = obj.project_id;
    let user_id = obj.user_id

    sql("Select fp.*, fpf.file_name, fpf.file_category, fpf.file_path, fpf.file_key, fpf.file_mimetype, fpt.project_type_name from fw_project as fp INNER JOIN fw_project_files as fpf ON fp.id = fpf.project_id INNER JOIN fw_project_type as fpt ON fp.project_type_id = fpt.id where fp.user_id = ? AND fp.id = ?", [user_id, project_id], function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });

};

projectSchema.updateProject = function (updatedProjectDetails, result) {

    let updateQuery = `UPDATE fw_project SET project_name = '${updatedProjectDetails.project_name}', project_topic = '${updatedProjectDetails.project_topic}', project_type = '${updatedProjectDetails.project_type}', quantity = '${updatedProjectDetails.quantity}', word_count = '${updatedProjectDetails.word_count}', project_dtl = '${updatedProjectDetails.project_dtl}', additional_resources = '${updatedProjectDetails.additional_resources}', project_type_id = '${updatedProjectDetails.project_type_id}', project_cost = '${updatedProjectDetails.project_cost}', choice_of_writers = '${updatedProjectDetails.choice_of_writers}', writers_career = '${updatedProjectDetails.writers_career}', writers_age = '${updatedProjectDetails.writers_age}', writers_location = '${updatedProjectDetails.writers_location}', project_file = '${updatedProjectDetails.project_file}' WHERE id='${updatedProjectDetails.project_id}'`;

    sql(updateQuery, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

projectSchema.cancelProject = function (project_id, result) {

    let updateQuery = `UPDATE fw_project SET project_status = 'Cancel' WHERE id='${project_id}'`;

    sql(updateQuery, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};




// Project Files
const projectFileSchema = function (file) {
    this.user_id = file.user_id;
    this.project_id = file.project_id;
    this.file_path = file.file_path;
    this.file_name = file.file_name;
    this.file_key = file.file_key;
    this.file_mimetype = file.file_mimetype;
    this.file_category = file.file_category;
}

projectFileSchema.addProjectFiles = async function (newProjectFile, result) {

    sql("INSERT INTO fw_project_files set ?", newProjectFile, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(err, null);
        } else {
            //console.log(res);
            result(null, res.insertId);
        }
    });
};

projectFileSchema.updateProjectFiles = function (updatedProjectFileDetails, result) {

    let updateQuery = `UPDATE fw_project_files SET file_path = '${updatedProjectFileDetails.file_name}', file_name = '${updatedProjectFileDetails.file_name}', file_key = '${updatedProjectFileDetails.file_key}', file_mimetype = '${updatedProjectFileDetails.file_mimetype}' WHERE project_id='${updatedProjectFileDetails.project_id}'`;

    sql(updateQuery, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};


// Project Status Schema

const projectStatusSchema = function (status) {
    this.user_id = status.user_id;
    this.project_id = status.project_id;
    this.project_status = status.project_status;
    this.status_date = new Date();    
}

projectStatusSchema.addProjectStatus = async function (newProjectStatus, result) {

    sql("INSERT INTO fw_project_status set ?", newProjectStatus, function (err, res) {
        if (err) {
            //console.log("error: ", err);
            result(err, null);
        } else {
            //console.log(res);
            result(null, res.insertId);
        }
    });
};

projectStatusSchema.getProjectStatusById = function (projectId, result) {
    
    sql("Select * from fw_project_status where project_id = ? ", projectId, function (err, res) {
        if (err) {
            //console.log(err);              
            result(err, null);
        } else {
            //console.log(res);
            result(null, res);
        }
    });
};

const projectJoiSchema = {

    project_code: Joi.string().trim().min(10).max(10).required(),
    project_name: Joi.string().trim().min(2).max(200).required(),
    project_topic: Joi.string().trim().min(2).max(50).required(),
    project_type: Joi.string().trim().min(2).max(50).required(),
    quantity: Joi.number().required(),
    word_count: Joi.number().required(),
    project_details: Joi.string().trim().required(),
    additional_resources: Joi.string().trim().allow(''),
    additional_resources: Joi.string().trim().allow(''),
    project_package: Joi.number().required(),
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
module.exports.projectStatusSchema = projectStatusSchema;
module.exports.projectFileSchema = projectFileSchema;
module.exports.validateProject = validateProject;