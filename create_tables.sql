create table establishments(
id int unsigned primary key
,name varchar(100)
,lat  float
,long float
,address varchar(100)
,beers int[] unsigned
);

create table beers(
id int unsigned primary key
,name varchar(100)
,brewery vharchar(100)
,ibu smallint unsigned
,abv float
,limited_release bool
,description text
);

create table likes(
device_guid varchar(255)
,beer_id int unsigned
,age tinyint unsigned
,like_type tinyint unsigned
,like_status bool
);

create table status(
establishment_id int unsigned
,beer_id int unsigned
,status tinyint unsigned
,reported_out_count int unsigned
,last_out_update datetime
);


