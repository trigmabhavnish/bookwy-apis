const fs = require('fs'); //file system
const jwt = require('jsonwebtoken'); //generate json token
const Joi = require('joi');
//const PasswordComplexity = require('joi-password-complexity');
const bcrypt = require('bcryptjs'); // for password encryption
const _ = require('lodash'); //js utility lib
Joi.objectId = require('joi-objectid')(Joi);  // Joi Object ID
var sql = require('../init/mysqldb');
var _this = this;

const projectSchema = function(project){
    this.project_name = project.project_name;
    this.project_topic = project.project_topic;
    this.project_type_id = project.project_package; // Plan Package
    this.project_dtl = project.project_details;
    this.quantity = project.quantity;
    this.word_count = project.word_count;
    this.project_cost = project.project_cost;   
    this.project_type = project.project_type; // new Field
    this.additional_resources = project.additional_resources; // new Field
    this.choice_of_writers = project.choice_of_writers; // new Field
    this.writers_career = project.writers_career; // new Field
    this.writers_age = project.writers_age; // new Field
    this.writers_location = project.writers_location; // new Field
    //this.keyword_id = project.keyword_id;
    //this.keyword_id = project.project_images;
}


projectSchema.createProject = async function (newProject, result) {      
    
    sql("INSERT INTO fw_project set ?", newProject, function (err, res) {            
            if(err) {
                //console.log("error: ", err);
                result(err, null);
            }else{
                //console.log(res);
                result(null, res.insertId);
            }
    });        
};

projectSchema.getProjectPackages = function (status, result) {
    sql("Select * from fw_project_type where status = ? ", status, function (err, res) {             
            if(err) {                  
                //console.log(err);              
                result(err, null);
            }else{
                //console.log(res);
                result(null, res);          
            }
        });   
};

module.exports.projectSchema = projectSchema;